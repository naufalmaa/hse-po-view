/// <reference types="cypress" />
/**
 * Pre-flight for the live scoring run (no engine / LLM needed): the randomly picked sample really
 * comes from the DB and from files that exist in uploads_demo, and covers every K3LL group.
 * Re-run with a different seed to look at another random sample:  E2E_SEED=random npx cypress run ...
 */
describe('CSMS AI — real data sample', () => {
  let sample: any

  before(() => {
    cy.task('sample:pick', { seed: Cypress.expose('SEED'), perGroup: Cypress.expose('FOCUS_PER_GROUP') }).then((s: any) => {
      sample = s
      cy.log(`${s.title} / ${s.rootName}: ${s.elements.length} scoreable elements, focus=${s.focus.length}, seed=${s.seed}`)
    })
  })

  it('picks a real contract root with the full set of scoreable K3LL elements', () => {
    expect(sample.elements.length, 'scoreable elements').to.be.within(24, 31)
    const groups = new Set(sample.elements.map((e: any) => e.name.match(/^\d/)![0]))
    expect([...groups].sort(), 'K3LL groups present').to.deep.eq(['1', '2', '3', '4', '5', '6', '7', '8'])
  })

  it('every focus element has real, non-empty files on disk (uploads_demo)', () => {
    expect(sample.focus.length, 'stratified focus sample (1 per group)').to.be.gte(8 * Number(Cypress.expose('FOCUS_PER_GROUP')) - 2)
    for (const id of sample.focus) {
      const el = sample.elements.find((x: any) => x.id === id)
      expect(el.files.length, `${el.name} has files`).to.be.greaterThan(0)
      el.files.forEach((f: any) => {
        expect(f.exists, `${f.name} exists under ${sample.uploads}`).to.eq(true)
        expect(f.bytes, `${f.name} size`).to.be.greaterThan(1000)
      })
    }
  })

  it('the demo DB is anonymised for this sample (no real company names in element/file names)', () => {
    cy.task('db:json', `select name from csms_contract_folder where contract_id = '${sample.contractId}'`).then((rows: any) => {
      const text = rows.map((r: any) => r.name).join('\n')
      expect(text).not.to.match(/pertamina|phe ?oses|baruna|sigapjaya/i)
    })
  })
})
