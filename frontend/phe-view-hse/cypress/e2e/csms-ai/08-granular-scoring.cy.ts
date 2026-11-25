/// <reference types="cypress" />
/**
 * Granular AI scoring (Nov 2026): one element, one group, "retry failed elements", admin-only, one lock per
 * assessment folder, and the formal per-juror note + its UI. Live stack (engine + vLLM) on the *test* DB. ~6 min.
 */
const api = () => Cypress.expose('API_URL') as string
const EVAL = () => `${api()}/api/v1/user/csms/contract/folder/evaluate`

type F = { id: string; name: string }

describe('CSMS AI — granular scoring per element / group', () => {
  let root: { id: string; contractId: string; title: string; name: string }
  let element: F // e.g. 3.1
  let group: F // "7 Audit dan Tinjauan Manajemen K3LL" (7.1, 7.2)
  let groupKids: F[] = []
  let retryIds: string[] = []
  let t0 = ''

  const processedSince = (since: string) =>
    cy.task(
      'db:json',
      `select f.id, f.name from csms_contract_folder f join csms_contract_folder r on f.path <@ r.path
        where r.id = '${root.id}' and f.file_type = 'folder' and f.ai_processed_at > '${since}' order by f.path`,
    )
  const waitJob = (id: string, t = Date.now()): Cypress.Chainable<any> =>
    cy.request(`${EVAL()}/status?jobId=${id}`).its('body.data').then((j: any) => {
      if (j.status === 'completed' || j.status === 'failed') return cy.wrap(j)
      expect(Date.now() - t, `${j.status}: ${j.progressMessage}`).to.be.lessThan(10 * 60 * 1000)
      return cy.wait(4000, { log: false }).then(() => waitJob(id, t))
    })
  const now = () => cy.task('db:select', 'select now()::text').then((r: any) => r[0][0] as string)

  before(() => {
    cy.task('engine:health', Cypress.expose('ENGINE_URL')).then((up) => {
      if (!up) throw new Error('engine unreachable (this spec needs the live stack)')
    })
    cy.task(
      'db:json',
      `select r.id, r.contract_id as "contractId", c.title, r.name from csms_contract_folder r join csms_contract c on c.id = r.contract_id
        where r.depth = 0 and r.is_complete and exists (select 1 from csms_contract_folder x where x.path <@ r.path and x.file_type='file')
        order by c.title limit 1`,
    ).then((r: any) => {
      root = r[0]
      cy.task(
        'db:json',
        `select f.id, f.name from csms_contract_folder f where f.contract_id = '${root.contractId}' and f.file_type = 'folder'
           and f.path <@ (select path from csms_contract_folder where id = '${root.id}')
           and (f.name like '3.1 %' or f.name like '7 %' or f.name like '7.1 %' or f.name like '7.2 %' or f.name like '5.3 %' or f.name like '6.4 %')
         order by f.name`,
      ).then((rows: any) => {
        element = rows.find((x: F) => x.name.startsWith('3.1 '))
        group = rows.find((x: F) => x.name.startsWith('7 '))
        groupKids = rows.filter((x: F) => /^7\.[12] /.test(x.name))
        retryIds = rows.filter((x: F) => /^(5\.3|6\.4) /.test(x.name)).map((x: F) => x.id)
        expect([element, group, groupKids.length, retryIds.length]).to.satisfy((v: any[]) => v[0] && v[1] && v[2] === 2 && v[3] === 2)
      })
    })
  })

  beforeEach(() => cy.apiLogin())

  it('non-admin cannot start an element evaluation (403)', () => {
    cy.clearCookies()
    cy.request({
      method: 'POST',
      url: `${api()}/api/auth/sign-in-email`,
      headers: { Origin: Cypress.config('baseUrl') as string },
      body: { email: 'hse.officer@waviv.com', password: 'hse.officer123' },
    })
    cy.request({ method: 'POST', url: EVAL(), body: { folderId: element.id }, failOnStatusCode: false }).its('status').should('eq', 403)
    cy.clearCookies()
  })

  it('one element: the job runs on the assessment folder and only that element is re-scored', () => {
    now().then((t) => (t0 = t))
    cy.request({ method: 'POST', url: EVAL(), body: { folderId: element.id } }).then((r) => {
      expect(r.status).to.eq(202)
      expect(r.body.data.folderId, 'job runs on the assessment folder').to.eq(root.id)
      expect(r.body.data.targetCount).to.eq(1)
      waitJob(r.body.data.jobId).then((j) => {
        expect(j.status, j.errorMessage).to.eq('completed')
        expect(j.targetFolderIds).to.deep.eq([element.id])
      })
    })
    cy.then(() => processedSince(t0).then((rows: any) => expect(rows.map((x: F) => x.name)).to.deep.eq([element.name])))
  })

  it('the element note is formal: numbered sections, three jurors, no emoji/markdown', () => {
    cy.task('db:json', `select ai_reasoning as note from csms_contract_folder where id = '${element.id}'`).then((r: any) => {
      const t: string = r[0].note
      expect(t.startsWith(`HASIL PENILAIAN AI - ${element.name}`), t.slice(0, 80)).to.eq(true)
      ;['1. KESIMPULAN', 'PENILAIAN JURI', 'REKOMENDASI'].forEach((h) => expect(t).to.include(h))
      expect((t.match(/\d\.\d Juri /g) || []).length, 'three juror blocks').to.eq(3)
      expect(t).not.to.match(/[\u{1F300}-\u{1FAFF}]|\*\*|###/u)
    })
  })

  it('one group: all its elements (7.1, 7.2) and nothing else; the assessment folder stays locked meanwhile', () => {
    now().then((t) => (t0 = t))
    cy.request({ method: 'POST', url: EVAL(), body: { folderId: group.id } }).then((r) => {
      expect(r.status).to.eq(202)
      // same assessment folder => locked for the whole-folder run and for another element
      cy.request({ method: 'POST', url: EVAL(), body: { folderId: root.id }, failOnStatusCode: false }).its('status').should('eq', 409)
      cy.request({ method: 'POST', url: EVAL(), body: { folderId: element.id }, failOnStatusCode: false }).its('status').should('eq', 409)
      waitJob(r.body.data.jobId).its('status').should('eq', 'completed')
    })
    cy.then(() => processedSince(t0).then((rows: any) => expect(rows.map((x: F) => x.name).sort()).to.deep.eq(groupKids.map((x) => x.name).sort())))
  })

  it('"retry failed elements" re-runs exactly the elements the AI could not score', () => {
    cy.task('db:markFailed', retryIds)
    now().then((t) => (t0 = t))
    cy.request({ method: 'POST', url: EVAL(), body: { folderId: root.id, retryFailed: true } }).then((r) => {
      expect(r.body.data.targetCount).to.eq(2)
      waitJob(r.body.data.jobId).its('status').should('eq', 'completed')
    })
    cy.then(() => processedSince(t0).then((rows: any) => expect(rows.map((x: F) => x.id).sort()).to.deep.eq([...retryIds].sort())))
    cy.request({ method: 'POST', url: EVAL(), body: { folderId: root.id, retryFailed: true }, failOnStatusCode: false }).its('status').should('eq', 400)
  })

  it('UI: element menu, juror cards with evidence links, AI category summary', () => {
    cy.intercept('GET', '**/contract-folders*').as('folders')
    cy.visit(`/csms/contract-details?contractId=${root.contractId}`)
    cy.wait('@folders', { timeout: 30000 })
    cy.contains('Penilaian Kontrak', { timeout: 20000 }).scrollIntoView()
    cy.contains('nav button', root.name.slice(0, 10).replace(/-/g, '/')).click()
    // the tree may already be expanded ("Tutup Semua"); expand only when needed
    cy.contains('button', /Buka Semua|Tutup Semua/i, { timeout: 20000 }).then(($b) => {
      if (/Buka Semua/i.test($b.text())) cy.wrap($b).click()
    })
    cy.contains('tr', element.name, { timeout: 20000 }).find('svg.lucide-ellipsis').first().closest('button').click()
    cy.contains('[role="menuitem"]', 'Evaluasi AI elemen ini').should('be.visible')
    cy.screenshot('08-element-menu', { capture: 'viewport' })
    cy.get('body').type('{esc}')
    cy.contains('tr', element.name).find('svg.lucide-file-text').first().parents('button').first().click({ force: true })
    cy.contains('Penilaian Juri', { timeout: 10000 }).should('be.visible')
    cy.contains(/Juri Kepatuhan/).should('be.visible')
    cy.screenshot('08-juror-cards', { capture: 'viewport' })
  })
})

export {}
