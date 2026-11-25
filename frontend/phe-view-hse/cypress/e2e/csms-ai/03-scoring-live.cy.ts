/// <reference types="cypress" />
/**
 * CSMS AI scoring on REAL data: a random (seeded) contract from the DB, its real uploaded PDFs in
 * uploads_demo, a real evaluation through Fastify -> csms-ai -> vLLM, then invariants on every score.
 * Needs the full stack (see cypress/README.md). Skips itself when the engine is not reachable.
 */
const api = () => Cypress.expose('API_URL') as string
const EVAL = () => `${api()}/api/v1/user/csms/contract/folder/evaluate`
const VALID = [0, 3, 6, 10]
const FAKE_MARKERS = [/Synthesized based on verified category evidence/i, /PROCESSING:/, /AI tidak tersedia/i]

type El = { id: string; name: string; baselineScore: number; baselineStatus: string; files: { name: string; exists: boolean; bytes: number }[] }

describe('CSMS AI scoring — real data', () => {
  let engineUp = false
  let sample: { seed: string; rootId: string; title: string; rootName: string; elements: El[]; focus: string[]; uploads: string }
  let startedAt = ''
  let jobId = ''
  const progress: string[] = []
  let rows: any[] = []
  let job: any

  before(function () {
    cy.task('engine:health', Cypress.expose('ENGINE_URL')).then((up) => {
      engineUp = !!up
      if (!engineUp) {
        if (Cypress.expose('REQUIRE_LIVE') === '1') throw new Error(`csms-ai engine unreachable at ${Cypress.expose('ENGINE_URL')} (E2E_REQUIRE_LIVE=1)`)
        cy.log('csms-ai engine offline -> scoring suite skipped')
        this.skip()
      }
    })
    cy.task('sample:pick', { seed: Cypress.expose('SEED'), perGroup: Cypress.expose('FOCUS_PER_GROUP') }).then((s: any) => {
      sample = s
      cy.log(`sample: ${s.title} / ${s.rootName} (${s.elements.length} elements, focus ${s.focus.length}), seed=${s.seed}`)
    })
  })

  beforeEach(() => cy.apiLogin())

  it('vLLM is reachable and serves the configured reasoning model', () => {
    cy.task('llm:models').then((m: any) => {
      cy.log(`vLLM ${m.base}: ${m.served.join(', ')}`)
      expect(m.served, `models served at ${m.base}`).to.include(m.expected)
    })
  })

  it('starts an evaluation (202 + jobId) and a duplicate trigger is rejected (409)', () => {
    cy.task('db:select', 'select now()::text').then((r: any) => (startedAt = r[0][0]))
    cy.request({ method: 'POST', url: EVAL(), body: { folderId: sample.rootId } }).then((r) => {
      expect(r.status).to.eq(202)
      expect(r.body.data.jobId).to.match(/^[0-9a-f-]{36}$/)
      jobId = r.body.data.jobId
    })
    cy.then(() =>
      cy.request({ method: 'POST', url: EVAL(), body: { folderId: sample.rootId }, failOnStatusCode: false }).its('status').should('eq', 409),
    )
  })

  it('finishes within the timeout and reports progress for subfolders', () => {
    const deadline = Date.now() + Number(Cypress.expose('JOB_TIMEOUT_MS'))
    const poll = (): Cypress.Chainable<any> =>
      cy.request(`${EVAL()}/status?jobId=${jobId}`).then((r) => {
        const j = r.body.data
        if (j.progressMessage && progress[progress.length - 1] !== j.progressMessage) progress.push(j.progressMessage)
        if (j.status === 'completed' || j.status === 'failed') return cy.wrap(j)
        expect(Date.now(), `job still ${j.status}: ${j.progressMessage}`).to.be.lessThan(deadline)
        return cy.wait(8000, { log: false }).then(poll)
      })
    poll().then((j) => {
      job = j
      expect(j.status, `job error: ${j.errorMessage}`).to.eq('completed')
      expect(progress.some((m) => /subfolder \d+\/\d+/i.test(m)), `progress messages: ${progress.slice(-3).join(' | ')}`).to.eq(true)
    })
  })

  it('records which model answered and no element is left "AI unavailable"', () => {
    expect(job.modelUsed, 'job.model_used').to.be.a('string').and.not.be.empty
    expect(job.errorMessage, 'job.error_message (elements the AI could not score)').to.be.oneOf([null, undefined, ''])
    cy.task(
      'db:json',
      `select e.id, e.name, e.ai_score::float as score, e.ai_status::text as status, coalesce(e.ai_reasoning,'') as reasoning,
              e.ai_processed_at::text as processed,
              (select count(*) from csms_contract_folder f where f.file_type='file' and f.path <@ e.path) as nfiles
         from csms_contract_folder e where e.id in (${sample.elements.map((x) => `'${x.id}'`).join(',')})`,
    ).then((r: any) => {
      rows = r
    })
  })

  it('every scoreable element with files has a valid, honest score', () => {
    const withFiles = rows.filter((r) => Number(r.nfiles) > 0)
    expect(withFiles.length).to.be.greaterThan(20)
    withFiles.forEach((r) => {
      expect(VALID, `${r.name}: score ${r.score}`).to.include(r.score)
      expect(r.score, `${r.name}: min 3 when documents were submitted`).to.be.gte(3)
      expect(r.status, `${r.name}: accept <=> score >= 6`).to.eq(r.score >= 6 ? 'accept' : 'reject')
      expect(r.processed > startedAt, `${r.name}: processed during this run (${r.processed} vs ${startedAt})`).to.eq(true)
      expect(r.reasoning, `${r.name}: reasoning`).to.include('PENILAIAN JURI')
      FAKE_MARKERS.forEach((re) => expect(r.reasoning, `${r.name}: must not match ${re}`).not.to.match(re))
    })
  })

  it('scores are grounded: reasoning cites content that really is in the uploaded PDF', () => {
    // The seeded PDFs all say "complete & verified", so identical scores are legitimate here; what must hold is that
    // the verdict derives from the document. Distinctive tokens (numbers, codes, long words) of the real PDF text
    // must show up in the AI reasoning.
    const checked: string[] = []
    sample.focus.forEach((id) => {
      const el = sample.elements.find((x) => x.id === id)!
      const r = rows.find((x) => x.id === id)
      cy.task('pdf:text', (el.files[0] as any).abs).then((text: any) => {
        const tokens = Array.from(new Set(String(text).match(/[A-Za-z0-9][A-Za-z0-9.,\/-]{5,}/g) ?? []))
        const hits = tokens.filter((t) => r.reasoning.includes(t)).length
        checked.push(`${el.name.slice(0, 16)}:${hits}/${tokens.length}`)
        expect(hits, `${el.name}: tokens of the PDF found in the reasoning (${tokens.length} candidates)`).to.be.gte(2)
      })
    })
    cy.then(() => cy.log(`grounding: ${checked.join(' | ')}`))
  })

  it('focus sample: juror breakdown is complete and consensus lies within the jurors', () => {
    sample.focus.forEach((id) => {
      const r = rows.find((x) => x.id === id)
      // formal note: "2.1 Juri Kepatuhan (Compliance) - skor 6 (keyakinan 0,90)"
      const jurors = [...r.reasoning.matchAll(/\d\.\d Juri (Kepatuhan|Bukti|HSE)[^\n]* - skor (\d+) \(keyakinan ([\d,]+)\)/g)]
      expect(jurors.map((m) => m[1]).sort(), `${r.name}: three jurors`).to.deep.eq(['Bukti', 'HSE', 'Kepatuhan'])
      const js = jurors.map((m) => Number(m[2]))
      js.forEach((s) => expect(VALID, `${r.name}: juror score`).to.include(s))
      jurors.forEach((m) => expect(Number(m[3].replace(',', '.')), `${r.name}: confidence`).to.be.within(0, 1))
      expect(r.reasoning, `${r.name}: no emoji / markdown`).not.to.match(/[\u{1F300}-\u{1FAFF}]|\*\*|###/u)
      expect(r.score, `${r.name}: consensus ${r.score} vs jurors ${js}`).to.be.within(Math.min(...js, 3), Math.max(...js))
    })
  })

  it('root folder score is recalculated (0..100) and evidence chunks were stored for this run', () => {
    cy.task('db:json', `select ai_score::float as score, ai_status::text as status from csms_contract_folder where id = '${sample.rootId}'`).then((r: any) => {
      expect(r[0].score).to.be.within(0, 100)
      expect(r[0].status).to.be.oneOf(['accept', 'reject'])
    })
    cy.task('db:select', `select count(*) from csms_evidence_chunk where contract_folder_id = '${sample.rootId}'`).then((r: any) => {
      expect(Number(r[0][0]), 'evidence chunks').to.be.greaterThan(0)
    })
  })

  it('no folder is left in a "PROCESSING" state and no job is left active', () => {
    cy.task(
      'db:select',
      `select count(*) from csms_contract_folder f join csms_contract_folder r on f.path <@ r.path where r.id = '${sample.rootId}' and f.ai_reasoning like 'PROCESSING:%'`,
    ).then((r: any) => expect(Number(r[0][0])).to.eq(0))
    cy.request(`${EVAL()}/active?folderId=${sample.rootId}`).its('body.data').should('be.null')
  })

  after(() => {
    if (!engineUp || !rows.length) return
    const withFiles = rows.filter((r) => Number(r.nfiles) > 0)
    const agree = withFiles.filter((r) => Math.abs(sample.elements.find((x) => x.id === r.id)!.baselineScore - r.score) <= 3).length
    const secs = job?.startedAt && job?.completedAt ? Math.round((+new Date(job.completedAt) - +new Date(job.startedAt)) / 1000) + ' s' : '-'
    const md = [
      '# CSMS AI scoring — e2e report',
      '',
      `- Run: ${new Date().toISOString()}  ·  seed: ${sample.seed}`,
      `- Contract: **${sample.title}** · root folder: ${sample.rootName} (${sample.rootId})`,
      `- Job: ${jobId} · status: ${job?.status} · model: ${job?.modelUsed ?? '-'} · duration: ${secs}`,
      `- Elements scored: ${withFiles.length} · agreement with seeded baseline (|Δ| ≤ 3): ${agree}/${withFiles.length}`,
      '',
      '| Element | Files | Baseline (seed) | AI score | Status | In focus sample |',
      '|---|---:|---:|---:|---|:-:|',
      ...withFiles.map((r) => {
        const el = sample.elements.find((x) => x.id === r.id)!
        return `| ${r.name} | ${el.files.length} | ${el.baselineScore} | ${r.score} | ${r.status} | ${sample.focus.includes(r.id) ? '✔' : ''} |`
      }),
    ].join('\n')
    cy.task('report:write', { name: 'csms-ai-scoring-report.md', content: md })
  })
})

export {} // module scope: keeps helper names local to this spec
