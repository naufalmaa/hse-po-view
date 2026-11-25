/// <reference types="cypress" />
/**
 * AI modes, rubric and evaluator corrections (Nov 2026, PLAN_AI_MODES_RUBRIC_FEEDBACK.md):
 *  - the mode dialog is shown for every run and explains fast vs thorough; cancel starts nothing
 *  - a fast run of one element finishes within the 10-minute element limit and is labelled "Mode: Cepat"
 *  - "priority only" targets only elements not final for the evaluator / changed since the AI run
 *  - the correction field appears for an admin when the evaluator score differs from the AI score, and is stored
 *  - admin page: AI quality, rubric (29 elements), manual edit => new version, re-activate, Excel export
 *  - all of it is admin only
 * Live stack (engine + vLLM) on the *test* DB. ~12 min.
 */
const api = () => Cypress.expose('API_URL') as string
const EVAL = () => `${api()}/api/v1/user/csms/contract/folder/evaluate`
const ADMIN = () => `${api()}/api/v1/admin/csms-ai`

type F = { id: string; name: string; score: number; ai: number }

describe('CSMS AI — modes, rubric, corrections', () => {
  let root: { id: string; contractId: string; name: string }
  let element: F

  const waitJob = (id: string, t = Date.now()): Cypress.Chainable<any> =>
    cy.request(`${EVAL()}/status?jobId=${id}`).its('body.data').then((j: any) => {
      if (j.status === 'completed' || j.status === 'failed') return cy.wrap({ ...j, ms: Date.now() - t })
      expect(Date.now() - t, `${j.status}: ${j.progressMessage}`).to.be.lessThan(12 * 60 * 1000)
      return cy.wait(4000, { log: false }).then(() => waitJob(id, t))
    })
  const openRoot = () => {
    cy.intercept('GET', '**/contract-folders*').as('folders')
    cy.visit(`/csms/contract-details?contractId=${root.contractId}`)
    cy.wait('@folders', { timeout: 30000 })
    cy.contains('Penilaian Kontrak', { timeout: 20000 }).scrollIntoView()
    cy.contains('nav button', root.name.slice(0, 10).replace(/-/g, '/')).click()
    cy.wait(2000) // folder tree + AI panel re-render after the selection
  }
  // the folder row, not a file row such as "3.1 Struktur Organisasi ... K3LL.pdf"
  const elementRow = () =>
    cy.get('tr', { timeout: 20000 }).should('contain', element.name).filter((_, el) => {
      const t = el.textContent ?? ''
      return t.includes(element.name) && !t.includes(`${element.name}.`)
    }).first()
  const expandAll = () =>
    cy.contains('button', /Buka Semua|Tutup Semua/i, { timeout: 20000 }).then(($b) => {
      if (/Buka Semua/i.test($b.text())) cy.wrap($b).click()
    })

  before(() => {
    cy.task('engine:health', Cypress.expose('ENGINE_URL')).then((up) => {
      if (!up) throw new Error('engine unreachable (this spec needs the live stack)')
    })
    cy.task(
      'db:json',
      `select r.id, r.contract_id as "contractId", r.name from csms_contract_folder r join csms_contract c on c.id = r.contract_id
        where r.depth = 0 and r.is_complete and exists (select 1 from csms_contract_folder x where x.path <@ r.path and x.file_type='file')
        order by c.title limit 1`,
    ).then((r: any) => {
      root = r[0]
      cy.task(
        'db:json',
        `select f.id, f.name, f.score::float as score, f.ai_score::float as ai from csms_contract_folder f
          where f.contract_id = '${root.contractId}' and f.file_type = 'folder' and f.name like '3.1 %'
            and f.path <@ (select path from csms_contract_folder where id = '${root.id}')`,
      ).then((rows: any) => (element = rows[0]))
    })
  })

  beforeEach(() => cy.apiLogin())

  it('non-admin: AI admin API is forbidden and no AI controls are shown', () => {
    cy.clearCookies()
    cy.request({
      method: 'POST',
      url: `${api()}/api/auth/sign-in-email`,
      headers: { Origin: Cypress.config('baseUrl') as string },
      body: { email: 'hse.officer@waviv.com', password: 'hse.officer123' },
    })
    cy.request({ url: `${ADMIN()}/quality`, failOnStatusCode: false }).its('status').should('eq', 403)
    cy.request({ url: `${ADMIN()}/rubric/items`, failOnStatusCode: false }).its('status').should('eq', 403)
    cy.request({ method: 'POST', url: EVAL(), body: { folderId: root.id, mode: 'fast' }, failOnStatusCode: false }).its('status').should('eq', 403)
    cy.clearCookies()
  })

  it('the mode dialog explains both modes; cancel starts no job', () => {
    openRoot()
    cy.contains('button', /AI Evaluate|Re-Evaluate AI/, { timeout: 20000 }).should('be.enabled')
    cy.contains('button', /AI Evaluate|Re-Evaluate AI/).click()
    cy.get('[data-testid="ai-mode-dialog"]').should('be.visible').within(() => {
      cy.get('[data-testid="ai-mode-fast"]').should('contain', 'maksimal 10 menit per elemen')
      cy.get('[data-testid="ai-mode-thorough"]').should('contain', '30 menit per elemen').and('contain', 'Tiga juri')
      cy.contains('skor akhir tetap ditetapkan evaluator')
      cy.get('[data-testid="ai-priority-only"]').should('exist')
    })
    cy.screenshot('09-mode-dialog', { capture: 'viewport' })
    cy.contains('[data-testid="ai-mode-dialog"] button', 'Batal').click()
    cy.get('[data-testid="ai-mode-dialog"]').should('not.exist')
    cy.request(`${EVAL()}/active?folderId=${root.id}`).its('body.data').should('not.exist')
  })

  it('element menu -> dialog -> fast run: within the element limit, note says "Mode: Cepat"', () => {
    openRoot()
    expandAll()
    elementRow().find('svg.lucide-ellipsis').first().closest('button').click()
    cy.contains('[role="menuitem"]', 'Evaluasi AI elemen ini').click()
    cy.get('[data-testid="ai-mode-dialog"]').should('contain', element.name)
    cy.intercept('POST', '**/folder/evaluate').as('start')
    cy.get('[data-testid="ai-mode-fast"]').click()
    cy.get('[data-testid="ai-mode-start"]').click()
    cy.wait('@start').then(({ request, response }) => {
      expect(request.body).to.include({ folderId: element.id, mode: 'fast' })
      expect(response?.statusCode).to.eq(202)
      waitJob(response!.body.data.jobId).then((j) => {
        expect(j.status, j.errorMessage).to.eq('completed')
        expect(j.mode).to.eq('fast')
        expect(j.ms, 'fast element limit 10 min (+ queue/finish margin)').to.be.lessThan(11 * 60 * 1000)
        cy.log(`fast element run: ${Math.round(j.ms / 1000)} s`)
      })
    })
    cy.task('db:json', `select ai_reasoning as note, ai_score::float as ai from csms_contract_folder where id = '${element.id}'`).then((r: any) => {
      expect(r[0].note).to.match(/^HASIL PENILAIAN AI/)
      expect(r[0].note.split('\n')[1]).to.include('Mode: Cepat')
      element.ai = r[0].ai
    })
  })

  it('priority only: targets exactly the elements not final for the evaluator or changed since the AI run', () => {
    cy.request(`${EVAL()}/changed?folderId=${root.id}`).its('body.data').then((d: any) => {
      cy.request({ method: 'POST', url: EVAL(), body: { folderId: root.id, priorityOnly: true, mode: 'fast' }, failOnStatusCode: false }).then((r) => {
        if (d.priorityCount === 0) {
          expect(r.status).to.eq(400)
          expect(r.body.message).to.match(/Semua elemen sudah dinilai/)
        } else {
          expect(r.status).to.eq(202)
          expect(r.body.data.targetCount).to.eq(d.priorityCount)
          cy.request({ method: 'POST', url: `${EVAL()}/cancel`, body: { jobId: r.body.data.jobId } })
        }
      })
    })
  })

  // The rating dialog is closed for a final assessment folder, and the only AI-scored folder of the test DB is
  // final, so the correction is checked on the API the dialog calls (field: aiFeedback).
  it('evaluator correction: stored only when the score differs from the AI score, shown in AI quality', () => {
    const reason = `Uji koreksi ${Date.now()}: bagan organisasi belum disahkan manajemen`
    const other = element.ai === 3 ? 6 : 3
    const ASSESS = `${api()}/api/v1/user/csms/contract/folder/assessment`
    const count = () => cy.task('db:select', `select count(*) from csms_ai_feedback where folder_id = '${element.id}'`).then((r: any) => Number(r[0][0]))
    if ([0, 3, 6, 10].includes(element.ai)) {
      count().then((n0) => {
        // same score as the AI: nothing stored
        cy.request({ method: 'POST', url: ASSESS, body: { folderId: element.id, status: 'accept', score: element.ai, aiFeedback: 'tidak disimpan' } })
        count().should('eq', n0)
      })
    }
    cy.request({ method: 'POST', url: ASSESS, body: { folderId: element.id, status: 'accept', score: other, aiFeedback: reason } })
    cy.task('db:json', `select element_code as code, evaluator_score::float as ev, reason from csms_ai_feedback where folder_id = '${element.id}' order by created_at desc limit 1`).then((r: any) => {
      expect(r[0]).to.deep.eq({ code: '3.1', ev: other, reason })
    })
    cy.request(`${ADMIN()}/quality`).its('body.data.corrections').then((c: any[]) => expect(c.map((x) => x.reason)).to.include(reason))
    // restore the evaluator's score
    cy.request({ method: 'POST', url: ASSESS, body: { folderId: element.id, status: 'accept', score: element.score } })
  })

  it('admin page: quality, rubric edit => new active version, re-activate, export', () => {
    cy.request(`${ADMIN()}/rubric/versions`).its('body.data').then((before: any[]) => {
      const active = before.find((v) => v.isActive)
      cy.visit('/admin/csms-ai')
      cy.get('[data-testid="ai-quality"]', { timeout: 20000 }).should('contain', 'Kesesuaian per elemen').and('contain', 'Koreksi terbaru')
      cy.screenshot('09-ai-quality', { capture: 'viewport' })
      cy.contains('[role="tab"]', 'Rubrik AI').click()
      cy.get('[data-testid="ai-rubric"]').should('contain', `versi ${active.version}`)
      cy.get('[data-testid="ai-rubric"] button').filter(':contains("Kepemimpinan")').should('have.length.at.least', 1)
      cy.contains('[data-testid="ai-rubric"] button', /^6\.5/).click()
      // live quality check of the element + what the jurors read
      cy.get('[data-testid="rubric-lint"]').should('contain', 'label Check').and('contain', 'Aturan skor')
      cy.contains('button', 'Lihat yang dibaca juri AI').click()
      cy.get('[data-testid="rubric-lint"] pre').should('contain', 'KRITERIA EVALUASI (AI CHECKS)')
      // fields are grouped in sections; "Catatan" is under "Petunjuk untuk AI"
      cy.contains('[data-testid="ai-rubric"] button', 'Petunjuk untuk AI').click()
      const note = `Catatan uji Cypress ${Date.now()}`
      cy.get('[data-testid="rubric-field-notes"]').clear().type(note)
      cy.get('[data-testid="rubric-save"]').should('be.disabled') // a version label is required
      cy.get('[data-testid="rubric-label"]').type('Uji Cypress')
      cy.screenshot('09-rubric-edit', { capture: 'viewport' })
      cy.get('[data-testid="rubric-save"]').click()
      const next = Math.max(...before.map((v) => v.version)) + 1
      cy.contains(`versi ${next}`, { timeout: 10000 })
      cy.request(`${ADMIN()}/rubric/items`).its('body.data').then((d: any) => {
        expect(d.items).to.have.length(29)
        expect(d.items.find((i: any) => i.no === '6.5').notes).to.eq(note)
      })
      cy.request(`${ADMIN()}/rubric/versions`).its('body.data.0.label').should('eq', 'Uji Cypress')
      // trial dialog lists final assessment folders (the trial itself is not started here)
      cy.get('[data-testid="rubric-trial"]').first().click()
      cy.get('[data-testid="rubric-trial-dialog"]').should('contain', 'set acuan').find('[role="checkbox"]').should('have.length.at.least', 1)
      cy.get('[data-testid="rubric-trial-start"]').should('be.disabled')
      cy.get('body').type('{esc}')
      cy.contains('[role="tab"]', 'Panduan kalibrasi').click()
      cy.get('[data-testid="ai-guide"]').should('contain', 'Uji sebelum mengaktifkan')
      // back to the version that was active before
      cy.request({ method: 'POST', url: `${ADMIN()}/rubric/versions/${active.id}/activate` })
      cy.request({ url: `${ADMIN()}/rubric/export`, encoding: 'binary' }).then((r) => {
        expect(r.headers['content-type']).to.include('spreadsheetml')
        expect(r.body.slice(0, 2)).to.eq('PK')
      })
    })
  })
})

export {}
