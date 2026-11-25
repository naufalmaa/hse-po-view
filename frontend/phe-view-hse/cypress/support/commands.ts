/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      /** Sign in through the real Better Auth endpoint; the session cookie is reused across specs. */
      apiLogin(): Chainable<void>
    }
  }
}

Cypress.Commands.add('apiLogin', () => {
  cy.session(
    ['api', Cypress.expose('USER_EMAIL')],
    () => {
      cy.request({
        method: 'POST',
        url: `${Cypress.expose('API_URL')}/api/auth/sign-in-email`,
        headers: { Origin: Cypress.config('baseUrl') as string },
        body: { email: Cypress.expose('USER_EMAIL'), password: Cypress.expose('USER_PASSWORD') },
      }).its('status').should('eq', 200)
    },
    { cacheAcrossSpecs: true },
  )
})

export {}
