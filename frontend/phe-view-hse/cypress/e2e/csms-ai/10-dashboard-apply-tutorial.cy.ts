/// <reference types="cypress" />
/**
 * Result CSMS AI dashboard, "Terapkan rekomendasi AI" safety, in-app tutorial and PDF guides (Nov 2026,
 * PLAN_AI_DASHBOARD_TUTORIAL.md). No LLM call: works on the AI results already in the test DB. ~2 min.
 */
import { tutorialsFor } from '../../../src/constants/tutorials'

const api = () => Cypress.expose('API_URL') as string
const APPLY = () => `${api()}/api/v1/user/csms/contract/folder/apply-ai`

describe('CSMS AI — result dashboard, apply, tutorial', () => {
  let root: { id: string; contractId: string; name: string; isFinal: boolean }

  const openRoot = () => {
    cy.intercept('GET', '**/contract-folders*').as('folders')
    cy.visit(`/csms/contract-details?contractId=${root.contractId}`)
    cy.wait('@folders', { timeout: 30000 })
    cy.contains('[data-tour="root-folders"] button', root.name.slice(0, 10).replace(/-/g, '/'), { timeout: 20000 }).click()
    cy.wait(1500)
  }

  before(() => {
    cy.task(
      'db:json',
      `select r.id, r.contract_id as "contractId", r.name, coalesce(r.is_final, false) as "isFinal" from csms_contract_folder r
        where r.depth = 0 and r.is_complete
          and exists (select 1 from csms_contract_folder f where f.path <@ r.path and f.ai_reasoning like 'HASIL PENILAIAN AI%')
        order by r.is_final desc limit 1`,
    ).then((r: any) => (root = r[0]))
  })

  beforeEach(() => cy.apiLogin())

  it('apply: preview lists every element with current vs AI values; a final folder cannot be changed', () => {
    cy.request({ method: 'POST', url: APPLY(), body: { folderId: root.id, action: 'preview' } }).its('body.data').then((d: any) => {
      expect(d.candidates.length).to.be.greaterThan(20)
      const valid = d.candidates.filter((c: any) => c.next)
      expect(valid.length, 'elements with an AI result').to.be.greaterThan(0)
      valid.forEach((c: any) => {
        expect([0, 3, 6, 10]).to.include(c.next.score)
        expect(c.next.status).to.eq(c.next.score >= 6 ? 'accept' : c.next.score >= 3 ? 'revision' : 'reject')
      })
      // default selection: only elements not yet assessed, with confidence >= 0.85
      d.candidates.filter((c: any) => c.selected).forEach((c: any) => {
        expect(c.current.status).to.eq('pending')
        expect(c.confidence).to.be.at.least(0.85)
      })
      if (d.isFinal) {
        cy.request({ method: 'POST', url: APPLY(), body: { folderId: root.id, action: 'apply', elementIds: [valid[0].id] }, failOnStatusCode: false })
          .then((r) => {
            expect(r.status).to.eq(409)
            expect(r.body.message).to.match(/sudah final/)
          })
        cy.request({ method: 'POST', url: APPLY(), body: { folderId: root.id, action: 'undo' }, failOnStatusCode: false }).its('status').should('eq', 409)
      }
    })
  })

  it('Result CSMS AI: dashboard with KPIs, categories, AI note and Excel export', () => {
    openRoot()
    cy.get('[data-testid="ai-result-button"]').click()
    cy.get('[data-testid="ai-result-dashboard"]').should('be.visible').within(() => {
      cy.contains('Skor total manual')
      cy.contains('Sama persis')
      cy.get('[data-testid="ai-result-table"] tbody tr').should('have.length.at.least', 8) // categories 1..8
      cy.get('canvas').should('exist') // ECharts
      cy.contains('[data-testid="ai-result-table"] button', 'Kepemimpinan').click()
      cy.contains('button', 'Catatan AI').first().click()
      cy.contains('Kesimpulan')
    })
    cy.screenshot('10-ai-result-dashboard', { capture: 'viewport' })
    cy.intercept('GET', '**/ai-evaluation/export*').as('export')
    cy.get('[data-testid="ai-export-excel"]').click()
    cy.wait('@export').its('response.statusCode').should('eq', 200)
    cy.get('[data-testid="ai-only-diff"]').click()
    // only rows with a difference remain: no "sama" (same) badge left
    cy.get('[data-testid="ai-result-table"] tr:has(td.pl-7) [data-slot="badge"]').filter((_, el) => el.textContent?.trim() === 'sama').should('have.length', 0)
  })

  it('Terapkan rekomendasi AI opens a preview (no blind overwrite)', () => {
    openRoot()
    cy.get('[data-testid="ai-result-button"]').click()
    cy.get('body').then(($b) => {
      if (!$b.find('[data-testid="ai-apply-all"]').length) return // final folder: the button is hidden in the dashboard
      cy.get('[data-testid="ai-apply-all"]').click()
      cy.get('[data-testid="ai-apply-dialog"]').should('be.visible').find('[data-testid="ai-apply-row"]').should('have.length.at.least', 20)
    })
    cy.get('body').type('{esc}')
  })

  it('tutorial: highlighted on first visit, list per role, tour runs and can be closed, progress kept, PDF downloadable', () => {
    cy.visit('/hse-performance')
    cy.window().then((w) => Object.keys(w.localStorage).filter((k) => k.startsWith('safeview-tutorial')).forEach((k) => w.localStorage.removeItem(k)))
    cy.reload()
    cy.get('[data-testid="tutorial-intro"]', { timeout: 20000 }).should('be.visible').and('contain', 'Baru: Tutorial')
    cy.get('[data-testid="nav-tutorial"]').click()
    cy.get('[data-testid="tutorial-item"]').should('have.length', tutorialsFor('admin').length)
    cy.contains('[data-testid="tutorial-item"]', 'Mulai di sini').contains('button', 'Mulai').click()
    cy.get('.driver-popover', { timeout: 10000 }).should('be.visible').and('contain', 'Menu utama').and('contain', '1 / 5')
    cy.screenshot('10-tutorial-step', { capture: 'viewport' })
    cy.get('.driver-popover-next-btn').click()
    cy.get('.driver-popover').should('contain', '2 / 5')
    cy.get('body').type('{esc}')
    cy.get('.driver-popover').should('not.exist')
    cy.get('[data-testid="tutorial-intro"]').should('not.exist')
    cy.get('[data-testid="nav-tutorial"]').click()
    cy.contains('[data-testid="tutorial-item"]', 'Mulai di sini').should('contain', 'Ulang')
    cy.get('[data-testid="tutorial-pdf"]').invoke('attr', 'href').then((href) => {
      expect(href).to.match(/panduan-safeview-admin\.pdf$/)
      cy.request({ url: href as string, encoding: 'binary' }).then((r) => {
        expect(r.status).to.eq(200)
        expect(r.body.slice(0, 4)).to.eq('%PDF')
      })
    })
  })

  it('tutorial for a contractor: own list, no admin tutorials, own PDF', () => {
    cy.clearCookies()
    cy.request({
      method: 'POST',
      url: `${api()}/api/auth/sign-in-email`,
      headers: { Origin: Cypress.config('baseUrl') as string },
      body: { email: 'contractor@waviv.com', password: 'contractor123' },
    })
    cy.visit('/csms/dashboard')
    cy.get('[data-testid="nav-tutorial"]', { timeout: 20000 }).click()
    cy.get('[data-testid="tutorial-item"]').should('have.length', tutorialsFor('contractor').length).and('not.contain', 'AI CSMS')
    cy.get('[data-testid="tutorial-pdf"]').should('have.attr', 'href').and('match', /panduan-safeview-contractor\.pdf$/)
    cy.clearCookies()
  })
})

export {}
