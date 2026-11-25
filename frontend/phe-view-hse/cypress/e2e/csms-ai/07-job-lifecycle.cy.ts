/// <reference types="cypress" />
/**
 * Job lifecycle regression for the "stuck in 'Job created, waiting for processing'" bug (prod, Nov 2026):
 * queue position + queue message, cancel a queued job (engine must skip it), cancel a running job (engine
 * must stop and not overwrite it with "completed"), engine-health endpoint, and the UI states.
 * Needs the live stack (engine + vLLM) like spec 03. ~3 minutes.
 */
const api = () => Cypress.expose('API_URL') as string
const EVAL = () => `${api()}/api/v1/user/csms/contract/folder/evaluate`
const CANCELLED = 'Dibatalkan oleh pengguna'

type Root = { id: string; contractId: string; title: string; name: string }

describe('CSMS AI — job lifecycle (queue, cancel, health, UI)', () => {
  let roots: Root[] = []
  const jobs: Record<string, string> = {}

  const job = (id: string) => cy.request(`${EVAL()}/status?jobId=${id}`).its('body.data')
  const waitFor = (id: string, pred: (j: any) => boolean, timeoutMs = 120000, t0 = Date.now()): Cypress.Chainable<any> =>
    job(id).then((j: any) => {
      if (pred(j)) return cy.wrap(j)
      expect(Date.now() - t0, `job ${id}: still ${j.status} / ${j.progressMessage}`).to.be.lessThan(timeoutMs)
      return cy.wait(2000, { log: false }).then(() => waitFor(id, pred, timeoutMs, t0))
    })

  before(() => {
    cy.task('engine:health', Cypress.expose('ENGINE_URL')).then((up) => {
      if (!up) throw new Error('engine unreachable (this spec needs the live stack)')
    })
    cy.task(
      'db:json',
      `select r.id, r.contract_id as "contractId", c.title, r.name
         from csms_contract_folder r join csms_contract c on c.id = r.contract_id
        where r.depth = 0 and r.file_type = 'folder' and r.is_complete
          and exists (select 1 from csms_contract_folder x where x.path <@ r.path and x.file_type = 'file')
        order by c.title limit 2`,
    ).then((r: any) => {
      roots = r
      expect(roots.length, 'two real assessment folders with files').to.eq(2)
    })
  })

  beforeEach(() => cy.apiLogin())

  it('engine-health endpoint reports the engine online', () => {
    cy.request(`${EVAL()}/engine-health`).its('body.data').should((d: any) => {
      expect(d.online).to.eq(true)
      expect(d.latencyMs).to.be.a('number')
    })
  })

  it('second job waits in the queue with a real message and position 2 (no silent "waiting for processing")', () => {
    cy.request({ method: 'POST', url: EVAL(), body: { folderId: roots[0].id } }).then((r) => (jobs.a = r.body.data.jobId))
    cy.request({ method: 'POST', url: EVAL(), body: { folderId: roots[1].id } }).then((r) => (jobs.b = r.body.data.jobId))
    cy.then(() => waitFor(jobs.a, (j) => j.status === 'processing' && !!j.startedAt))
    cy.then(() =>
      waitFor(jobs.b, (j) => j.progressMessage === 'Menunggu antrian evaluasi...', 30000).then((j: any) => {
        expect(j.status).to.eq('queued')
        expect(j.queuePosition, 'queue position').to.eq(2)
      }),
    )
    cy.then(() => cy.request(`${EVAL()}/active?folderId=${roots[1].id}`).its('body.data.queuePosition').should('eq', 2))
  })

  it('UI shows the queue state, the engine badge and a cancel button', () => {
    cy.intercept('GET', '**/contract-folders*').as('folders')
    cy.visit(`/csms/contract-details?contractId=${roots[1].contractId}`)
    cy.wait('@folders', { timeout: 30000 })
    cy.contains('Penilaian Kontrak', { timeout: 20000 }).scrollIntoView()
    cy.contains('nav button', roots[1].name.slice(0, 10).replace(/-/g, '/')).click()
    cy.contains(/Antri — posisi 2/, { timeout: 20000 }).should('be.visible')
    cy.contains(/Mesin AI online/).should('be.visible')
    cy.contains('button', 'Batalkan').should('be.visible')
    cy.screenshot('07-queued-state', { capture: 'viewport' })
  })

  it('cancelling the queued job closes it, and the engine skips it later', () => {
    cy.request({ method: 'POST', url: `${EVAL()}/cancel`, body: { jobId: jobs.b } }).its('status').should('eq', 200)
    job(jobs.b).should((j: any) => {
      expect(j.status).to.eq('failed')
      expect(j.errorMessage).to.eq(CANCELLED)
    })
    cy.request({ method: 'POST', url: `${EVAL()}/cancel`, body: { jobId: jobs.b }, failOnStatusCode: false }).its('status').should('eq', 409)
  })

  it('cancelling the running job stops it before the next element and it stays cancelled', () => {
    cy.request({ method: 'POST', url: `${EVAL()}/cancel`, body: { jobId: jobs.a } }).its('status').should('eq', 200)
    // one element takes ~45 s; after that the engine must have noticed and stopped
    cy.wait(75000)
    job(jobs.a).should((j: any) => {
      expect(j.status, 'not overwritten by "completed"').to.eq('failed')
      expect(j.errorMessage).to.eq(CANCELLED)
    })
    cy.task('db:select', `select count(*) from csms_contract_folder f join csms_contract_folder r on f.path <@ r.path where r.id='${roots[0].id}' and f.ai_reasoning like 'PROCESSING:%'`)
      .then((r: any) => expect(Number(r[0][0]), 'no PROCESSING marker left').to.eq(0))
    // the cancelled queued job was skipped, never started
    job(jobs.b).its('startedAt').should('be.null')
  })

  it('folders are free again: a new evaluation starts immediately', () => {
    cy.request({ method: 'POST', url: EVAL(), body: { folderId: roots[1].id } }).then((r) => {
      expect(r.status).to.eq(202)
      waitFor(r.body.data.jobId, (j) => j.status === 'processing', 30000)
      cy.request({ method: 'POST', url: `${EVAL()}/cancel`, body: { jobId: r.body.data.jobId } })
    })
  })
})

export {}
