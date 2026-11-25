/// <reference types="cypress" />
/**
 * Robustness: vLLM AND the OpenAI fallback are unreachable. The engine must never invent a score:
 * every element is marked "AI tidak tersedia", previous scores stay untouched, the job still ends
 * (no stuck lock) and reports which elements need a re-run.
 * Needs the engine started in outage mode:  bash cypress/scripts/start-engine.sh outage
 * and run with E2E_PHASE=outage (skips otherwise).
 */
const api = () => Cypress.expose('API_URL') as string
const EVAL = () => `${api()}/api/v1/user/csms/contract/folder/evaluate`

describe('CSMS AI — LLM outage (no fabricated scores)', () => {
  let sample: any
  let prev: any[] = []
  let rootBefore = 0
  let job: any
  let t0 = 0

  const elementsSql = (ids: string[]) => `
    select e.id, e.name, e.ai_score::float as score, e.ai_status::text as status, coalesce(e.ai_reasoning,'') as reasoning,
           e.ai_processed_at::text as processed,
           (select count(*) from csms_contract_folder f where f.file_type='file' and f.path <@ e.path) as nfiles
      from csms_contract_folder e where e.id in (${ids.map((i) => `'${i}'`).join(',')})`

  before(function () {
    if (Cypress.expose('PHASE') !== 'outage') {
      cy.log('E2E_PHASE != outage -> skipped')
      this.skip()
    }
    cy.task('engine:health', Cypress.expose('ENGINE_URL')).then((up) => {
      if (!up) throw new Error('engine must be running in outage mode (start-engine.sh outage)')
    })
    cy.task('sample:pick', { seed: Cypress.expose('SEED'), perGroup: 1 }).then((s: any) => {
      sample = s
      cy.task('db:json', elementsSql(s.elements.map((e: any) => e.id))).then((r: any) => (prev = r))
      cy.task('db:json', `select ai_score::float as score from csms_contract_folder where id='${s.rootId}'`).then((r: any) => (rootBefore = r[0].score))
    })
  })

  beforeEach(() => cy.apiLogin())

  it('evaluation finishes (no stuck job) even though no LLM answers', () => {
    t0 = Date.now()
    cy.request({ method: 'POST', url: EVAL(), body: { folderId: sample.rootId } }).then((r) => {
      expect(r.status).to.eq(202)
      const jobId = r.body.data.jobId
      const poll = (): Cypress.Chainable<any> =>
        cy.request(`${EVAL()}/status?jobId=${jobId}`).then((s) => {
          const j = s.body.data
          if (j.status === 'completed' || j.status === 'failed') return cy.wrap(j)
          expect(Date.now() - t0, `still ${j.status}: ${j.progressMessage}`).to.be.lessThan(15 * 60 * 1000)
          return cy.wait(3000, { log: false }).then(poll)
        })
      poll().then((j) => (job = j))
    })
  })

  it('job reports the elements the AI could not score and no model answered', () => {
    expect(job.status, 'nothing scored => failed run').to.eq('failed')
    expect(job.errorMessage, 'error_message').to.match(/AI unavailable for:/)
    expect(job.modelUsed, 'model_used').to.be.oneOf([null, undefined, ''])
  })

  it('every element is labelled "AI tidak tersedia" and keeps its previous score/status', () => {
    cy.task('db:json', elementsSql(sample.elements.map((e: any) => e.id))).then((after: any) => {
      const withFiles = after.filter((r: any) => Number(r.nfiles) > 0)
      expect(withFiles.length).to.be.greaterThan(20)
      withFiles.forEach((r: any) => {
        const b = prev.find((x) => x.id === r.id)
        expect(r.reasoning, `${r.name}: reasoning`).to.match(/AI tidak tersedia/i)
        expect(r.reasoning, `${r.name}: no fabricated juror text`).not.to.include('PENILAIAN JURI')
        expect(r.score, `${r.name}: score untouched`).to.eq(b.score)
        expect(r.status, `${r.name}: status untouched`).to.eq(b.status)
        expect(r.processed, `${r.name}: ai_processed_at untouched`).to.eq(b.processed)
      })
    })
  })

  it('root score is not distorted and nothing is left PROCESSING / locked', () => {
    cy.task('db:json', `select ai_score::float as score from csms_contract_folder where id='${sample.rootId}'`).then((r: any) => {
      expect(Math.abs(r[0].score - rootBefore), 'root score drift').to.be.lessThan(0.05)
    })
    cy.task('db:select', `select count(*) from csms_contract_folder f join csms_contract_folder r on f.path <@ r.path where r.id='${sample.rootId}' and f.ai_reasoning like 'PROCESSING:%'`)
      .then((r: any) => expect(Number(r[0][0])).to.eq(0))
    cy.request(`${EVAL()}/active?folderId=${sample.rootId}`).its('body.data').should('be.null')
  })

  it('a new evaluation can be started right away (folder is not locked)', () => {
    cy.request({ method: 'POST', url: EVAL(), body: { folderId: sample.rootId } }).its('status').should('eq', 202)
  })
})

export {}
