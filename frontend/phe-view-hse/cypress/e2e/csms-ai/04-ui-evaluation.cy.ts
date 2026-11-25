/// <reference types="cypress" />
/**
 * UI smoke for the CSMS AI evaluation on a real contract: login through the real form, open the
 * contract, check that AI results (score badge, juror reasoning) render without error toasts.
 * Optional live trigger from the UI:  E2E_UI_TRIGGER=1 (needs the engine, see cypress/README.md).
 */
describe('CSMS AI — contract details UI', () => {
  let sample: any

  before(() => {
    cy.task('sample:pick', { seed: Cypress.expose('SEED'), perGroup: 1 }).then((s) => (sample = s))
  })

  it('logs in through the login form (SafeView branding in demo mode)', () => {
    cy.visit('/login')
    cy.get('input[name="email"], input[type="text"]').first().type(Cypress.expose('USER_EMAIL') as string)
    cy.get('input[type="password"]').first().type(Cypress.expose('USER_PASSWORD') as string, { log: false })
    cy.get('button[type="submit"]').click()
    cy.location('pathname', { timeout: 20000 }).should('not.include', '/login')
  })

  // The page groups root folders under assessment-date tabs ("PENILAIAN ... 01/11/2026"):
  // open the tab for the sampled root (name starts with DD-MM-YYYY), then select the root row.
  const openRoot = () => {
    cy.apiLogin()
    // wait for the folder tree: selecting a tab before it arrives gets reset by the page
    cy.intercept('GET', '**/contract-folders*').as('folders')
    cy.visit(`/csms/contract-details?contractId=${sample.contractId}`)
    cy.wait('@folders', { timeout: 30000 })
    cy.contains(sample.title, { timeout: 20000 }).should('be.visible')
    cy.contains('Penilaian Kontrak', { timeout: 20000 }).scrollIntoView()
    const date = String(sample.rootName).slice(0, 10).replace(/-/g, '/')
    cy.contains('nav button', date, { timeout: 20000 }).click()
    cy.contains(sample.rootName, { timeout: 20000 }).click()
  }

  it('opens the sampled contract and shows the AI score of its assessment folder', () => {
    openRoot()
    cy.contains(/AI Score/i, { timeout: 20000 }).should('exist')
    cy.contains(/Re-Evaluate AI|AI Evaluate/i).should('exist')
    cy.get('[data-sonner-toast][data-type="error"]').should('not.exist')
  })

  it('scored elements show their AI verdict in the folder table', () => {
    openRoot()
    sample.focus.forEach((id: string) => {
      const el = sample.elements.find((e: any) => e.id === id)
      cy.contains('tr, [role="row"]', el.name, { timeout: 20000 }).invoke('text').should('match', /AI:\s*(Accept|Reject)/)
    })
  })

  it('UI trigger: AI Evaluate runs to completion without an error toast (opt-in)', function () {
    if (!Cypress.expose('UI_TRIGGER')) this.skip()
    openRoot()
    cy.contains('button', /Re-Evaluate AI|AI Evaluate/i).click()
    cy.contains(/AI Evaluasi Berjalan/i, { timeout: 30000 }).should('be.visible')
    cy.contains(/Evaluasi AI Selesai/i, { timeout: Number(Cypress.expose('JOB_TIMEOUT_MS')) }).should('be.visible')
    cy.contains(/Evaluasi AI gagal/i).should('not.exist')
  })
})
