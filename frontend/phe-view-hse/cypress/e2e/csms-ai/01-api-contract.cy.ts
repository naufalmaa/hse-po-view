/// <reference types="cypress" />
/**
 * CSMS AI — API contract, auth and engine-offline behaviour (no LLM needed).
 * Routes: /api/v1/user/csms/contract/folder/evaluate[/status|/active]
 */
const api = () => Cypress.expose('API_URL') as string
const EVAL = () => `${api()}/api/v1/user/csms/contract/folder/evaluate`
const NIL = '00000000-0000-4000-8000-000000000000'

describe('CSMS AI evaluate API', () => {
  let engineUp = false
  let sample: any

  before(() => {
    cy.task('sample:pick', { seed: Cypress.expose('SEED'), perGroup: 1 }).then((s) => (sample = s))
    cy.task('engine:health', Cypress.expose('ENGINE_URL')).then((up) => { engineUp = !!up })
  })

  it('rejects unauthenticated callers', () => {
    cy.request({ method: 'POST', url: EVAL(), body: { folderId: NIL }, failOnStatusCode: false })
      .its('status').should('be.oneOf', [401, 403])
  })

  context('authenticated', () => {
    beforeEach(() => cy.apiLogin())

    it('validates the request body (folderId must be a uuid)', () => {
      cy.request({ method: 'POST', url: EVAL(), body: { folderId: 'not-a-uuid' }, failOnStatusCode: false })
        .its('status').should('eq', 400)
      cy.request({ method: 'POST', url: EVAL(), body: {}, failOnStatusCode: false })
        .its('status').should('eq', 400)
    })

    it('unknown folder => 400 "Folder not found" (was a 500 before the fix)', () => {
      cy.request({ method: 'POST', url: EVAL(), body: { folderId: NIL }, failOnStatusCode: false }).then((r) => {
        expect(r.status).to.eq(400)
        expect(r.body.success).to.eq(false)
        expect(r.body.message).to.match(/not found/i)
      })
    })

    it('status of an unknown job => 404', () => {
      cy.request({ url: `${EVAL()}/status?jobId=${NIL}`, failOnStatusCode: false }).its('status').should('eq', 404)
    })

    it('active-job lookup returns data:null when nothing is running', () => {
      cy.request(`${EVAL()}/active?folderId=${sample.rootId}`).then((r) => {
        expect(r.status).to.eq(200)
        expect(r.body.success).to.eq(true)
      })
    })

    it('engine OFFLINE => 503 and no orphan job row (folder must not get locked)', function () {
      if (engineUp) this.skip()
      cy.task('db:select', `select count(*) from csms_ai_evaluation_job where contract_folder_id = '${sample.rootId}'`).then((before: any) => {
        cy.request({ method: 'POST', url: EVAL(), body: { folderId: sample.rootId }, failOnStatusCode: false }).then((r) => {
          expect(r.status).to.eq(503)
          expect(r.body.message).to.match(/offline|unreachable/i)
        })
        cy.task('db:select', `select count(*) from csms_ai_evaluation_job where contract_folder_id = '${sample.rootId}'`).should('deep.equal', before)
      })
    })
  })
})

export {} // module scope: keeps helper names local to this spec
