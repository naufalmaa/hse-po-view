import { defineConfig } from 'cypress'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

/**
 * E2E for CSMS AI scoring against REAL data (rows in the DB + files in uploads_demo).
 * The stack under test is a *copy* (safeview_hse_test): the tests trigger real evaluations and
 * overwrite ai_score/ai_reasoning, so they refuse to run against any DB whose name lacks "test".
 * See cypress/README.md for how to bring the stack up.
 */
const e = process.env
const DB = e.E2E_DB ?? 'safeview_hse_test'
const PSQL = e.PSQL_BIN ?? 'psql'
const PY = e.E2E_PYTHON ?? path.resolve('../../backend/phe-view-hse/backend/csms-ai/.venv/Scripts/python.exe')
const UPLOADS = path.resolve(e.E2E_UPLOADS_DIR ?? '../../backend/phe-view-hse/uploads_test')

function sql(query: string): string[][] {
  if (!/test/i.test(DB)) throw new Error(`E2E refuses DB "${DB}" (name must contain "test"). Run cypress/scripts/prepare-test-db.sh`)
  if (!/^\s*select\b/i.test(query)) throw new Error('only SELECT is allowed from specs')
  const out = execFileSync(
    PSQL,
    ['-h', e.E2E_PGHOST ?? 'localhost', '-p', e.E2E_PGPORT ?? '5432', '-U', e.E2E_PGUSER ?? 'postgres', '-d', DB, '-At', '-F', '\t', '-c', query],
    { env: { ...process.env, PGPASSWORD: e.E2E_PGPASSWORD ?? e.PGPASSWORD ?? '' }, encoding: 'utf8' },
  )
  return out.split(/\r?\n/).filter(Boolean).map((l) => l.split('\t')) // psql on Windows ends lines with \r\n
}

// deterministic RNG so a failing sample can be reproduced with the same E2E_SEED
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Same list the engine scores (csms-ai/server/main.py OFFICIAL_SCOREABLE_NAMES)
const SCOREABLE = /^(1 Kepemimpinan|2 Kebijakan|3\.[1-6] |4\.[1-8] |5\.[1-4] |6\.[1-5] |7\.[12] |8\.[12] )/

export default defineConfig({
  e2e: {
    baseUrl: e.E2E_FRONTEND_URL ?? 'http://127.0.0.1:5173',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    video: false,
    screenshotsFolder: 'cypress/reports/screenshots',
    defaultCommandTimeout: 10000,
    requestTimeout: 30000,
    expose: {  // Cypress 16: Cypress.env() was removed; these are non-sensitive local demo values
      API_URL: e.E2E_API_URL ?? 'http://127.0.0.1:3101',
      ENGINE_URL: e.E2E_ENGINE_URL ?? 'http://127.0.0.1:8003',
      USER_EMAIL: e.E2E_USER ?? 'admin@waviv.com',
      USER_PASSWORD: e.E2E_PASSWORD ?? 'admin123',
      SEED: e.E2E_SEED ?? '20261101',
      JOB_TIMEOUT_MS: Number(e.E2E_JOB_TIMEOUT_MS ?? 45 * 60 * 1000),
      FOCUS_PER_GROUP: Number(e.E2E_FOCUS_PER_GROUP ?? 1),
      UI_TRIGGER: e.E2E_UI_TRIGGER ?? '',
      // 1 (default): unreachable engine/vLLM/DB FAILS the live suite instead of skipping it
      // which phase the externally started stack is in: '' (normal) | 'outage' (vLLM+OpenAI unreachable) | 'stability'
      PHASE: e.E2E_PHASE ?? '',
      STABILITY_MIN_IDENTICAL: Number(e.E2E_STABILITY_MIN_IDENTICAL ?? 0.7),
      STABILITY_MAX_FLIP_RATE: Number(e.E2E_STABILITY_MAX_FLIP_RATE ?? 0.1),
      REQUIRE_LIVE: e.E2E_REQUIRE_LIVE ?? '1',
      // tutorial screenshots for the PDF guides (cypress/e2e/tutorial/capture.cy.ts)
      CAPTURE: e.E2E_CAPTURE ?? '',
      CAPTURE_ROLES: e.E2E_CAPTURE_ROLES ?? '',
    },
    setupNodeEvents(on) {
      on('task', {
        /** Pick a representative random sample of real data: 1 contract root + stratified elements. */
        'sample:pick'({ seed, perGroup }: { seed: string; perGroup: number }) {
          const rand = rng(seed === 'random' ? Math.floor(Math.random() * 1e9) : Number(seed))
          const roots = sql(`
            select r.id, c.id, c.title, r.name
              from csms_contract_folder r join csms_contract c on c.id = r.contract_id
             where r.depth = 0 and r.file_type = 'folder' and r.is_complete
               and exists (select 1 from csms_contract_folder x where x.path <@ r.path and x.file_type = 'file')
             order by r.id`)
          if (!roots.length) throw new Error('no complete contract root folder with files in ' + DB)
          const [rootId, contractId, title, rootName] = roots[Math.floor(rand() * roots.length)]
          const rows = sql(`
            select e.id, e.name, e.ai_score, e.ai_status, e.depth,
                   f.id, f.file_path, f.name
              from csms_contract_folder r
              join csms_contract_folder e on e.path <@ r.path and e.file_type = 'folder'
              left join csms_contract_folder f on f.file_type = 'file' and f.path <@ e.path
             where r.id = '${rootId}' order by e.path`)
          const byEl = new Map<string, any>()
          for (const [id, name, score, status, depth, fid, fpath, fname] of rows) {
            if (!SCOREABLE.test(name)) continue
            const el = byEl.get(id) ?? { id, name, depth: Number(depth), baselineScore: Number(score), baselineStatus: status, files: [] }
            if (fid) {
              const abs = path.join(UPLOADS, 'csms', 'contracts', contractId, rootId, fid, fpath)
              el.files.push({ id: fid, name: fname, abs, exists: fs.existsSync(abs), bytes: fs.existsSync(abs) ? fs.statSync(abs).size : 0 })
            }
            byEl.set(id, el)
          }
          const elements = [...byEl.values()]
          // stratified random focus set: `perGroup` random elements per major group (1..8)
          const focus: string[] = []
          for (let g = 1; g <= 8; g++) {
            const pool = elements.filter((x) => x.name.startsWith(String(g)) && x.files.length)
            for (let k = 0; k < perGroup && pool.length; k++) focus.push(pool.splice(Math.floor(rand() * pool.length), 1)[0].id)
          }
          // negative controls for spec 06: three elements from different K3LL groups
          const kinds = ['irrelevant', 'deficient', 'blank']
          const controls = [focus[1], focus[3], focus[5]].filter(Boolean).map((id, i) => ({ id, kind: kinds[i] }))
          return { seed, uploads: UPLOADS, controls, rootId, contractId, title, rootName, elements, focus }
        },
        /** true when the csms-ai engine answers /health (done in node: cy.request throws on refused connections) */
        async 'engine:health'(url: string) {
          try {
            const r = await fetch(`${url}/health`, { signal: AbortSignal.timeout(5000) })
            return r.ok
          } catch {
            return false
          }
        },
        /** vLLM served models, from E2E_LLM_URL or csms-ai/configs/model_roles.json (reasoning_model) */
        async 'llm:models'() {
          const roles = JSON.parse(fs.readFileSync(path.resolve('../../backend/phe-view-hse/backend/csms-ai/configs/model_roles.json'), 'utf8'))
          const base: string = e.E2E_LLM_URL ?? roles.reasoning_model.endpoint
          const r = await fetch(`${base.replace(/\/$/, '')}/models`, { signal: AbortSignal.timeout(10000) })
          if (!r.ok) throw new Error(`vLLM ${base}/models -> HTTP ${r.status}`)
          const body: any = await r.json()
          return { base, expected: roles.reasoning_model.model, served: body.data.map((m: any) => m.id) }
        },
        /** text of a PDF (PyMuPDF from the csms-ai venv) - used to check that AI reasoning is grounded in it */
        'pdf:text'(file: string) {
          const code = "import sys,pymupdf;d=pymupdf.open(sys.argv[1]);print(' '.join(' '.join(p.get_text() for p in d).split()))"
          return execFileSync(PY, ['-c', code, file], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
        },
        /** Overwrite ALL pdfs of an element's file directories (incl. thumbnail/) with a negative-control document. Test uploads only. */
        'control:apply'({ files, kind, title }: { files: { abs: string }[]; kind: string; title: string }) {
          const done: string[] = []
          for (const f of files) {
            const dir = path.dirname(f.abs)
            const targets = [f.abs, path.join(dir, 'thumbnail', path.basename(f.abs))].filter((x) => fs.existsSync(x))
            for (const t of targets) {
              if (!/uploads_test/.test(t)) throw new Error('control:apply refuses to touch ' + t)
              execFileSync(PY, [path.resolve('cypress/scripts/make_control_pdf.py'), t, kind, title], { stdio: 'ignore' })
              done.push(t)
            }
          }
          return done
        },
        /** Test-only write: set ai_reasoning of folders (simulate elements the AI could not score). */
        'db:markFailed'(ids: string[]) {
          if (!ids.every((i) => /^[0-9a-f-]{36}$/.test(i))) throw new Error('bad ids')
          if (!/test/i.test(DB)) throw new Error('refusing to write outside a *test* DB')
          execFileSync(
            PSQL,
            ['-h', e.E2E_PGHOST ?? 'localhost', '-p', e.E2E_PGPORT ?? '5432', '-U', e.E2E_PGUSER ?? 'postgres', '-d', DB, '-c',
              `update csms_contract_folder set ai_reasoning = 'AI tidak tersedia untuk elemen ini (LLMError). Silakan evaluasi ulang.' where id in (${ids.map((i) => `'${i}'`).join(',')})`],
            { env: { ...process.env, PGPASSWORD: e.E2E_PGPASSWORD ?? e.PGPASSWORD ?? '' }, stdio: 'ignore' },
          )
          return null
        },
        'db:select'(query: string) {
          return sql(query)
        },
        /** rows as objects; multi-line text (ai_reasoning) survives because it is JSON-encoded */
        'db:json'(query: string) {
          const out = sql(`select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)::text from (${query}) t`)
          return JSON.parse(out[0][0])
        },
        'report:write'({ name, content }: { name: string; content: string }) {
          const dir = path.resolve('cypress/reports')
          fs.mkdirSync(dir, { recursive: true })
          fs.writeFileSync(path.join(dir, name), content, 'utf8')
          return null
        },
      })
    },
  },
})
