import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { Type } from "@sinclair/typebox";
import { withErrorHandler } from "../../../../utils/withErrorHandler.ts";
import {
  getAiQuality,
  deleteAiFeedback,
  listReferenceFolders,
  listRubricTrials,
  listRubricVersions,
  getRubricItems,
  updateRubricItem,
  activateRubricVersion,
  importRubricExcel,
  exportRubricExcel,
  RUBRIC_COLUMNS,
} from "../../../../services/csms/contract/ai-quality.service.ts";
import { createEvaluationJob, hasActiveJob } from "../../../../services/csms/contract/ai-evaluation.service.ts";

/** /api/v1/admin/csms-ai/* — AI quality and AI rubric (admin only, see admin.hook.ts). */
const err = Type.Object({ success: Type.Boolean(), message: Type.String() });
const fail = (reply: any, e: any) =>
  reply.status(e?.statusCode && e.statusCode < 600 ? e.statusCode : 400).send({ success: false, message: e?.message || "Gagal" });

const csmsAiAdminRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.get("/quality", {
    schema: {
      tags: ["CSMS AI Admin"],
      summary: "AI vs evaluator agreement per element and recent corrections",
      querystring: Type.Object({ contractId: Type.Optional(Type.String({ format: "uuid" })) }),
    },
    handler: withErrorHandler(async (req, reply) => {
      const { contractId } = req.query as { contractId?: string };
      return reply.send({ success: true, message: "ok", data: await getAiQuality(contractId) });
    }),
  });

  app.delete("/feedback/:id", {
    schema: { tags: ["CSMS AI Admin"], summary: "Delete one evaluator/synthetic correction", params: Type.Object({ id: Type.String({ format: "uuid" }) }) },
    handler: withErrorHandler(async (req, reply) => {
      const ok = await deleteAiFeedback((req.params as { id: string }).id);
      return ok ? reply.send({ success: true, message: "Koreksi dihapus" }) : reply.status(404).send({ success: false, message: "Koreksi tidak ditemukan" });
    }),
  });

  // P4: try a rubric version on 1 to 3 final assessment folders; their AI results are restored afterwards
  app.get("/reference-folders", {
    schema: { tags: ["CSMS AI Admin"], summary: "Final assessment folders usable as reference set" },
    handler: withErrorHandler(async (_req, reply) => reply.send({ success: true, message: "ok", data: await listReferenceFolders() })),
  });

  app.get("/rubric/trials", {
    schema: { tags: ["CSMS AI Admin"], summary: "Trial runs of rubric versions with agreement vs the evaluator" },
    handler: withErrorHandler(async (_req, reply) => reply.send({ success: true, message: "ok", data: await listRubricTrials() })),
  });

  app.post("/rubric/versions/:id/trial", {
    schema: {
      tags: ["CSMS AI Admin"],
      summary: "Run a rubric version on reference folders (trial; folders keep their AI results)",
      params: Type.Object({ id: Type.String({ format: "uuid" }) }),
      body: Type.Object({
        rootIds: Type.Array(Type.String({ format: "uuid" }), { minItems: 1, maxItems: 3 }),
        mode: Type.Optional(Type.Union([Type.Literal("fast"), Type.Literal("thorough")])),
      }),
    },
    handler: withErrorHandler(async (req, reply) => {
      const { id } = req.params as { id: string };
      const { rootIds, mode } = req.body as { rootIds: string[]; mode?: "fast" | "thorough" };
      const allowed = new Set((await listReferenceFolders()).map((r: any) => r.id));
      const jobs: string[] = [];
      for (const rootId of rootIds) {
        if (!allowed.has(rootId)) return reply.status(400).send({ success: false, message: "Folder acuan harus folder penilaian yang sudah final" });
        if (await hasActiveJob(rootId)) return reply.status(409).send({ success: false, message: "Ada evaluasi yang sedang berjalan pada folder acuan" });
      }
      try {
        for (const rootId of rootIds) {
          const j = await createEvaluationJob(rootId, (req as any).session?.user?.id, null, mode ?? "thorough", { rubricVersionId: id });
          jobs.push(j.jobId);
        }
      } catch (e: any) {
        return reply.status(503).send({ success: false, message: e?.message || "Mesin AI tidak dapat dihubungi" });
      }
      return reply.send({ success: true, message: `Uji rubrik dimulai pada ${jobs.length} folder acuan`, data: { jobIds: jobs } });
    }),
  });

  app.get("/rubric/versions", {
    schema: { tags: ["CSMS AI Admin"], summary: "Rubric versions (newest first)" },
    handler: withErrorHandler(async (_req, reply) => reply.send({ success: true, message: "ok", data: await listRubricVersions() })),
  });

  app.get("/rubric/items", {
    schema: {
      tags: ["CSMS AI Admin"],
      summary: "Rubric items of a version (active by default)",
      querystring: Type.Object({ versionId: Type.Optional(Type.String({ format: "uuid" })) }),
    },
    handler: withErrorHandler(async (req, reply) => {
      const { versionId } = req.query as { versionId?: string };
      return reply.send({ success: true, message: "ok", data: { ...(await getRubricItems(versionId)), columns: RUBRIC_COLUMNS } });
    }),
  });

  app.put("/rubric/items/:no", {
    schema: {
      tags: ["CSMS AI Admin"],
      summary: "Edit one element (creates and activates a new rubric version)",
      params: Type.Object({ no: Type.String({ pattern: "^\\d+(\\.\\d+)*$" }) }),
      body: Type.Record(Type.String(), Type.String()),
      response: { 400: err },
    },
    handler: withErrorHandler(async (req, reply) => {
      const { no } = req.params as { no: string };
      try {
        const v = await updateRubricItem(no, req.body as Record<string, string>, (req as any).session?.user?.id);
        return reply.send({ success: true, message: `Rubrik versi ${v.version} aktif`, data: v });
      } catch (e: any) {
        return fail(reply, e);
      }
    }),
  });

  app.post("/rubric/versions/:id/activate", {
    schema: { tags: ["CSMS AI Admin"], summary: "Activate a rubric version", params: Type.Object({ id: Type.String({ format: "uuid" }) }) },
    handler: withErrorHandler(async (req, reply) => {
      const ok = await activateRubricVersion((req.params as { id: string }).id);
      return ok ? reply.send({ success: true, message: "Versi rubrik diaktifkan" }) : reply.status(404).send({ success: false, message: "Versi tidak ditemukan" });
    }),
  });

  // multipart: file=<xlsx>, label=<text>
  app.post("/rubric/import", {
    schema: { tags: ["CSMS AI Admin"], summary: "Import rubric Excel (same columns as the knowledge-base file) as a new active version" },
    handler: withErrorHandler(async (req, reply) => {
      let file: { buffer: Buffer; filename: string } | null = null;
      let label = "";
      for await (const part of (req as any).parts()) {
        if (part.type === "file") file = { buffer: await part.toBuffer(), filename: part.filename };
        else if (part.fieldname === "label") label = String(part.value ?? "");
      }
      if (!file || !/\.xlsx$/i.test(file.filename)) return reply.status(400).send({ success: false, message: "Unggah berkas Excel (.xlsx)" });
      try {
        const v = await importRubricExcel(file.buffer, file.filename, label, (req as any).session?.user?.id);
        return reply.send({ success: true, message: `Rubrik versi ${v.version} (${v.items} elemen) aktif`, data: v });
      } catch (e: any) {
        return fail(reply, e);
      }
    }),
  });

  app.get("/rubric/export", {
    schema: {
      tags: ["CSMS AI Admin"],
      summary: "Export a rubric version as Excel (active by default)",
      querystring: Type.Object({ versionId: Type.Optional(Type.String({ format: "uuid" })) }),
    },
    handler: withErrorHandler(async (req, reply) => {
      const { versionId } = req.query as { versionId?: string };
      try {
        const buf = await exportRubricExcel(versionId);
        return reply
          .header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
          .header("Content-Disposition", `attachment; filename="rubrik-ai-marine${versionId ? "-" + versionId.slice(0, 8) : ""}.xlsx"`)
          .send(buf);
      } catch (e: any) {
        return fail(reply, e);
      }
    }),
  });
};

export default csmsAiAdminRoutes;
