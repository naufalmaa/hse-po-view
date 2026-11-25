/// <reference types="cypress" />
/**
 * Robustness #2 (one more full live run on the SAME contract, after spec 03):
 *  - DISCRIMINATION: three real documents are replaced by negative controls (irrelevant text, a "draft / expired /
 *    no evidence" document, an almost blank page). The AI must not keep awarding 10.
 *  - STABILITY: all other elements are unchanged, so their scores must be repeatable vs the previous run.
 * Needs E2E_PHASE=stability (skips otherwise) and writes cypress/reports/csms-ai-robustness.md.
 * Control PDFs are written only into uploads_test (never uploads_demo).
 */
const api = () => Cypress.expose('API_URL') as string
const EVAL = () => `${api()}/api/v1/user/csms/contract/folder/evaluate`
const MIN_IDENTICAL = Number(Cypress.expose('STABILITY_MIN_IDENTICAL'))
const MAX_FLIPS = Number(Cypress.expose('STABILITY_MAX_FLIP_RATE'))
const MAX_SCORE: Record<string, number> = { irrelevant: 3, deficient: 6, blank: 3 }

describe('CSMS AI — discrimination (negative controls) and stability', () => {
  let sample: any
  let run1: any[] = []
  let run2: any[] = []

  const snap = (ids: string[]) => `
    select e.id, e.name, e.ai_score::float as score, e.ai_status::text as status, e.ai_processed_at::text as processed,
           coalesce(e.ai_reasoning,'') as reasoning,
           (select count(*) from csms_contract_folder f where f.file_type='file' and f.path <@ e.path) as nfiles
      from csms_contract_folder e where e.id in (${ids.map((i) => `'${i}'`).join(',')})`

  before(function () {
    if (Cypress.expose('PHASE') !== 'stability') {
      cy.log('E2E_PHASE != stability -> skipped')
      this.skip()
    }
    cy.task('engine:health', Cypress.expose('ENGINE_URL')).then((up) => {
      if (!up) throw new Error('engine unreachable')
    })
    cy.task('sample:pick', { seed: Cypress.expose('SEED'), perGroup: 1 }).then((s: any) => {
      sample = s
      cy.task('db:json', snap(s.elements.map((e: any) => e.id))).then((r: any) => (run1 = r.filter((x: any) => Number(x.nfiles) > 0)))
    })
  })

  beforeEach(() => cy.apiLogin())

  it('baseline (previous live run) exists and the control documents are installed', () => {
    expect(run1.length).to.be.greaterThan(20)
    expect(sample.controls.length).to.eq(3)
    sample.controls.forEach((c: any) => {
      const el = sample.elements.find((e: any) => e.id === c.id)
      cy.task('control:apply', { files: el.files, kind: c.kind, title: el.name }).then((done: any) => {
        expect(done.length, `${el.name} (${c.kind}) pdfs replaced`).to.be.greaterThan(0)
      })
    })
  })

  it('re-evaluates the contract', () => {
    const t0 = Date.now()
    cy.request({ method: 'POST', url: EVAL(), body: { folderId: sample.rootId } }).then((r) => {
      expect(r.status).to.eq(202)
      const id = r.body.data.jobId
      const poll = (): Cypress.Chainable<any> =>
        cy.request(`${EVAL()}/status?jobId=${id}`).then((s) => {
          const j = s.body.data
          if (j.status === 'completed' || j.status === 'failed') return cy.wrap(j)
          expect(Date.now() - t0, j.progressMessage).to.be.lessThan(Number(Cypress.expose('JOB_TIMEOUT_MS')))
          return cy.wait(8000, { log: false }).then(poll)
        })
      poll().then((j) => {
        expect(j.status, j.errorMessage).to.eq('completed')
        expect(j.errorMessage, 'unscored elements').to.be.oneOf([null, undefined, ''])
      })
    })
    cy.task('db:json', snap(sample.elements.map((e: any) => e.id))).then((r: any) => (run2 = r.filter((x: any) => Number(x.nfiles) > 0)))
  })

  it('discriminates: irrelevant / deficient / blank documents do not get a top score', () => {
    sample.controls.forEach((c: any) => {
      const a = run1.find((x) => x.id === c.id)
      const b = run2.find((x) => x.id === c.id)
      cy.log(`${b.name} [${c.kind}]: ${a.score} -> ${b.score}`)
      expect(b.score, `${b.name} [${c.kind}] after control (was ${a.score})`).to.be.lte(MAX_SCORE[c.kind])
      expect(b.status, `${b.name}`).to.eq('reject')
      expect(b.reasoning, `${b.name}: still a real AI verdict`).to.include('PENILAIAN JURI')
    })
  })

  it('is repeatable on untouched elements (identical-rate and accept/reject flip-rate thresholds)', () => {
    const ctrl = new Set(sample.controls.map((c: any) => c.id))
    const pairs = run1.filter((a) => !ctrl.has(a.id)).map((a) => ({ a, b: run2.find((x) => x.id === a.id) }))
    pairs.forEach(({ a, b }) => expect(b.processed > a.processed, `${a.name} re-processed`).to.eq(true))
    const same = pairs.filter(({ a, b }) => a.score === b.score).length
    const flips = pairs.filter(({ a, b }) => a.status !== b.status).length
    const md = [
      '# CSMS AI — robustness (controls + stability)',
      '',
      `- Contract: **${sample.title}** · ${sample.rootName}`,
      `- Stability on ${pairs.length} untouched elements: identical ${same}/${pairs.length} (${Math.round((same / pairs.length) * 100)}%), accept/reject flips ${flips}`,
      '',
      '## Negative controls',
      '| Element | Control | Before | After | Status |',
      '|---|---|---:|---:|---|',
      ...sample.controls.map((c: any) => {
        const a = run1.find((x) => x.id === c.id)
        const b = run2.find((x) => x.id === c.id)
        return `| ${b.name} | ${c.kind} | ${a.score} | ${b.score} | ${b.status} |`
      }),
      '',
      '## Run 1 vs Run 2 (untouched elements)',
      '| Element | Run 1 | Run 2 | Δ |',
      '|---|---:|---:|---:|',
      ...pairs.map(({ a, b }) => `| ${a.name} | ${a.score} | ${b.score} | ${b.score - a.score} |`),
    ].join('\n')
    cy.task('report:write', { name: 'csms-ai-robustness.md', content: md })
    expect(same / pairs.length, `identical ${same}/${pairs.length} (min ${MIN_IDENTICAL})`).to.be.gte(MIN_IDENTICAL)
    expect(flips / pairs.length, `flips ${flips}/${pairs.length} (max ${MAX_FLIPS})`).to.be.lte(MAX_FLIPS)
  })
})

export {}
