import { sql } from "drizzle-orm";
import { db } from "../../../db/index.ts";
import { bulkUpdateFolderAssessment } from "./assessment.service.ts";

/**
 * "Terapkan rekomendasi AI" (PLAN_AI_DASHBOARD_TUTORIAL.md, F2).
 * Preview -> apply selected elements in one transaction -> undo the last apply.
 * Rules: never on a final assessment folder; only valid AI results ("HASIL PENILAIAN AI ...");
 * status from the score (10/6 accept, 3 revision, 0 reject); the evaluator note gets a short summary;
 * the evaluator can always change the score manually afterwards.
 */

const rows = <T>(res: any): T[] => ((res as any).rows ?? res) as T[];
const LEVELS = [0, 3, 6, 10];
export const MIN_CONFIDENCE = 0.85;

export const scoreLevel = (s: number) => LEVELS.reduce((b, l) => (Math.abs(l - s) < Math.abs(b - s) ? l : b), LEVELS[0]);
export const statusOfScore = (s: number) => (s >= 6 ? "accept" : s >= 3 ? "revision" : "reject") as "accept" | "revision" | "reject";

/** "Skor akhir: 6 (Diterima) | Tingkat keyakinan: 0,85 | Mode: Cepat" -> 0.85 */
export const confidenceOf = (note?: string | null) => {
  const m = note?.split("\n")[1]?.match(/Tingkat keyakinan:\s*([\d.,]+)/);
  return m ? parseFloat(m[1].replace(",", ".")) : null;
};

/** Short evaluator note from the formal AI note: conclusion + documents to complete. */
export const summaryOf = (note: string) => {
  const section = (title: RegExp) => {
    const m = note.match(new RegExp(`^\\d+\\.\\s+${title.source}[^\\n]*\\n([\\s\\S]*?)(?=^\\d+\\.\\s+[A-Z]|$(?![\\s\\S]))`, "m"));
    return m ? m[1].trim() : "";
  };
  const conclusion = section(/KESIMPULAN/).replace(/\s+/g, " ");
  const docs = section(/DOKUMEN YANG PERLU DILENGKAPI/)
    .split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 5).join("\n");
  return [`Rekomendasi AI: ${conclusion}`.slice(0, 1200), docs && `Dokumen yang perlu dilengkapi:\n${docs}`].filter(Boolean).join("\n\n");
};

const isScoreable = (name: string) => /^[12]\s/.test(name) || /^[3-8]\.\d+/.test(name);

export type ApplyCandidate = {
  id: string;
  name: string;
  current: { status: string; score: number };
  next: { status: string; score: number } | null;
  confidence: number | null;
  eligible: boolean;
  selected: boolean; // default selection: not yet assessed + eligible + confidence >= 0.85
  reason?: string;
};

async function rootOf(folderId: string) {
  return rows<{ rootId: string; isFinal: boolean | null; path: string }>(await db.execute(sql`
    SELECT r.id AS "rootId", r.is_final AS "isFinal", f.path::text AS path
      FROM csms_contract_folder f
      JOIN csms_contract_folder r ON r.contract_id = f.contract_id AND r.depth = 0 AND f.path <@ r.path
     WHERE f.id = ${folderId} LIMIT 1`))[0];
}

/** Elements under `scopeFolderId` (assessment folder, category or one element) with what applying would change. */
export async function previewAiApply(scopeFolderId: string) {
  const root = await rootOf(scopeFolderId);
  if (!root) throw Object.assign(new Error("Folder tidak ditemukan"), { statusCode: 404 });
  const list = rows<any>(await db.execute(sql`
    SELECT f.id, f.name, f.status, f.score::float AS score, f.ai_score::float AS "aiScore", f.ai_reasoning AS note,
           f.ai_processed_at AS processed
      FROM csms_contract_folder f
     WHERE f.file_type = 'folder' AND f.path <@ ${root.path}::ltree
     ORDER BY f.path`)).filter((f) => isScoreable(f.name));

  const candidates: ApplyCandidate[] = list.map((f) => {
    const valid = !!f.processed && typeof f.note === "string" && f.note.startsWith("HASIL PENILAIAN AI");
    const confidence = valid ? confidenceOf(f.note) : null;
    const score = valid ? scoreLevel(f.aiScore) : null;
    const next = score === null ? null : { status: statusOfScore(score), score };
    const same = !!next && next.score === f.score && next.status === f.status;
    const reason = !valid
      ? (f.note?.startsWith("AI tidak") ? "AI gagal menilai elemen ini" : "Belum ada hasil AI")
      : same ? "Sudah sama dengan rekomendasi AI" : undefined;
    const eligible = valid && !same;
    return {
      id: f.id,
      name: f.name,
      current: { status: f.status, score: f.score },
      next,
      confidence,
      eligible,
      selected: eligible && f.status === "pending" && (confidence ?? 0) >= MIN_CONFIDENCE,
      reason,
    };
  });
  return { rootId: root.rootId, isFinal: !!root.isFinal, minConfidence: MIN_CONFIDENCE, candidates };
}

/** Applies the AI recommendation to `elementIds` (all must be under `scopeFolderId`), in one transaction with an undo log. */
export async function applyAiRecommendations(scopeFolderId: string, elementIds: string[], userId?: string) {
  const preview = await previewAiApply(scopeFolderId);
  if (preview.isFinal) throw Object.assign(new Error("Folder penilaian sudah final; rekomendasi AI tidak dapat diterapkan"), { statusCode: 409 });
  const byId = new Map(preview.candidates.map((c) => [c.id, c]));
  const picked = [...new Set(elementIds)].map((id) => byId.get(id)).filter((c): c is ApplyCandidate => !!c && c.eligible);
  if (!picked.length) throw Object.assign(new Error("Tidak ada elemen yang dapat diterapkan"), { statusCode: 400 });

  const notes = new Map(rows<{ id: string; note: string; prev: string | null }>(await db.execute(sql`
    SELECT id, ai_reasoning AS note, note AS prev FROM csms_contract_folder
     WHERE id IN (${sql.join(picked.map((p) => sql`${p.id}::uuid`), sql`, `)})`)).map((r) => [r.id, r]));

  return db.transaction(async (tx) => {
    const batch = rows<{ id: string }>(await tx.execute(sql`SELECT gen_random_uuid() AS id`))[0].id;
    for (const p of picked) {
      await tx.execute(sql`
        INSERT INTO csms_ai_apply_log (batch_id, root_id, folder_id, prev_status, prev_score, prev_note, user_id)
        VALUES (${batch}, ${preview.rootId}, ${p.id}, ${p.current.status}, ${p.current.score}, ${notes.get(p.id)?.prev ?? null}, ${userId ?? null})`);
    }
    await bulkUpdateFolderAssessment({
      rootFolderId: preview.rootId,
      items: picked.map((p) => ({
        folderId: p.id,
        status: p.next!.status as any,
        score: p.next!.score,
        note: summaryOf(notes.get(p.id)?.note ?? ""),
      })),
      updatedBy: userId,
    }, tx);
    return { batchId: batch, applied: picked.length };
  });
}

/** Restores the values before the last (not yet undone) apply of this assessment folder. */
export async function undoLastAiApply(scopeFolderId: string) {
  const root = await rootOf(scopeFolderId);
  if (!root) throw Object.assign(new Error("Folder tidak ditemukan"), { statusCode: 404 });
  if (root.isFinal) throw Object.assign(new Error("Folder penilaian sudah final"), { statusCode: 409 });
  return db.transaction(async (tx) => {
    const last = rows<any>(await tx.execute(sql`
      SELECT folder_id AS id, prev_status AS status, prev_score::float AS score, prev_note AS note, batch_id AS batch
        FROM csms_ai_apply_log
       WHERE batch_id = (SELECT batch_id FROM csms_ai_apply_log WHERE root_id = ${root.rootId} AND undone_at IS NULL
                          ORDER BY created_at DESC LIMIT 1)`));
    if (!last.length) throw Object.assign(new Error("Tidak ada penerapan yang dapat dibatalkan"), { statusCode: 400 });
    await bulkUpdateFolderAssessment({
      rootFolderId: root.rootId,
      items: last.map((r) => ({ folderId: r.id, status: r.status, score: r.score, note: r.note ?? "" })),
    }, tx);
    await tx.execute(sql`UPDATE csms_ai_apply_log SET undone_at = now() WHERE batch_id = ${last[0].batch}`);
    return { restored: last.length };
  });
}

/** Whether there is an apply that can still be undone (for the UI button). */
export async function lastAiApply(scopeFolderId: string) {
  const root = await rootOf(scopeFolderId);
  if (!root) return null;
  const r = rows<{ count: number; createdAt: string | null }>(await db.execute(sql`
    SELECT count(*)::int AS count, max(created_at) AS "createdAt" FROM csms_ai_apply_log
     WHERE batch_id = (SELECT batch_id FROM csms_ai_apply_log WHERE root_id = ${root.rootId} AND undone_at IS NULL
                        ORDER BY created_at DESC LIMIT 1)`))[0];
  return r?.count ? { count: r.count, createdAt: r.createdAt } : null;
}
