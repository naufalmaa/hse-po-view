/// <reference types="cypress" />
/**
 * Screenshots for the per-role PDF guides (not a regression test; run explicitly):
 *   E2E_CAPTURE=1 npx cypress run --e2e --spec cypress/e2e/tutorial/capture.cy.ts
 * Runs on the anonymised demo copy (safeview_hse_test). For every role and tutorial: one overview shot and one shot
 * per step whose element is on the page, with that element outlined. Output: cypress/reports/screenshots/capture.cy.ts/<role>/...
 * Then: node backend/phe-view-hse/backend/scripts/build-tutorial-pdf.mjs
 */
import { TUTORIALS, type TutorialRole } from '../../../src/constants/tutorials'

const api = () => Cypress.expose('API_URL') as string
// demo accounts (anonymised demo DB; password pattern <email prefix>123)
const ACCOUNTS: Record<TutorialRole, string> = {
  admin: 'admin@waviv.com',
  user: 'hse.officer@waviv.com',
  contractor: 'contractor@waviv.com',
  evaluator: 'evaluator@waviv.com',
  verifikator: 'verifikator@waviv.com',
  manager: 'manager@waviv.com',
  crew: 'crew@waviv.com',
}
const ROLES = (Cypress.expose('CAPTURE_ROLES') as string | undefined)?.split(',').filter(Boolean) as TutorialRole[] | undefined

const login = (email: string) => {
  cy.clearCookies()
  cy.clearLocalStorage()
  cy.request({
    method: 'POST',
    url: `${api()}/api/auth/sign-in-email`,
    headers: { Origin: Cypress.config('baseUrl') as string },
    body: { email, password: `${email.split('@')[0]}123` },
  })
}

const outline = (selector: string) =>
  cy.document().then((doc) => {
    doc.querySelectorAll('[data-capture-outline]').forEach((el) => el.removeAttribute('data-capture-outline'))
    const el = doc.querySelector(selector) as HTMLElement | null
    if (!el) return false
    el.setAttribute('data-capture-outline', '1')
    el.scrollIntoView({ block: 'center' })
    return true
  })

describe('Tutorial screenshots for the PDF guides', () => {
  let contractFor: Record<string, string> = {}

  before(function () {
    if (!Cypress.expose('CAPTURE')) this.skip()
    cy.task(
      'db:json',
      `select (select r.contract_id from csms_contract_folder r where r.depth = 0 and r.is_complete
                 and exists (select 1 from csms_contract_folder f where f.path <@ r.path and f.ai_reasoning like 'HASIL PENILAIAN AI%') limit 1) as "phe",
              (select r.name from csms_contract_folder r where r.depth = 0 and r.is_complete
                 and exists (select 1 from csms_contract_folder f where f.path <@ r.path and f.ai_reasoning like 'HASIL PENILAIAN AI%') limit 1) as "pheRoot",
              (select c.id from csms_contract c join user_contractors uc on uc.contractor_id = c.contractor_id
                 join users u on u.id = uc.user_id where u.email = 'contractor@waviv.com' limit 1) as "contractor"`,
    ).then((r: any) => (contractFor = r[0]))
  })

  beforeEach(() => cy.viewport(1366, 820))

  ;(Object.keys(ACCOUNTS) as TutorialRole[])
    .filter((role) => !ROLES?.length || ROLES.includes(role))
    .forEach((role) => {
      it(`captures ${role}`, () => {
        login(ACCOUNTS[role])
        TUTORIALS.filter((t) => t.roles.includes(role)).forEach((t) => {
          const contract = role === 'contractor' ? contractFor.contractor : contractFor.phe
          const url = t.requiresPath ? `${t.requiresPath}?contractId=${contract}` : t.route ?? '/hse-performance'
          cy.visit(url, { failOnStatusCode: false })
          cy.get('[data-sidebar="sidebar"]', { timeout: 30000 })
          cy.wait(2500, { log: false }) // charts and tables settle
          if (t.requiresPath && role !== 'contractor' && contractFor.pheRoot) {
            // the assessment folder that has AI results (date in the name, e.g. 10-10-2026 -> 10/10/2026)
            cy.contains('[data-tour="root-folders"] button', contractFor.pheRoot.slice(0, 10).replace(/-/g, '/')).click()
            cy.wait(1500, { log: false })
          }
          cy.document().then((doc) => {
            const style = doc.createElement('style')
            style.textContent = '[data-capture-outline]{outline:3px solid #7c3aed!important;outline-offset:3px;border-radius:6px} [data-testid="tutorial-intro"]{display:none!important}'
            doc.head.appendChild(style)
          })
          cy.screenshot(`${role}/${t.id}-0`, { capture: 'viewport', overwrite: true })
          t.steps.forEach((s, i) => {
            if (!s.element) return
            outline(s.element).then((found) => {
              if (found) cy.screenshot(`${role}/${t.id}-${i + 1}`, { capture: 'viewport', overwrite: true })
            })
          })
        })
      })
    })
})

export {}
