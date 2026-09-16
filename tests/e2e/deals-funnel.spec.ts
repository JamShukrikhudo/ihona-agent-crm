import { expect, test } from '@playwright/test'

/**
 * Sprint 4-5's own acceptance check: a manager creates a lead, drags it
 * through the funnel via the UI, and the stage survives a reload — i.e.
 * LeadController::transition actually persisted it, not just the
 * optimistic local patch.
 *
 * Needs a sales-manager or developer-admin account (a plain 'agent' seed
 * user is rejected by the /deals route's own middleware) — unlike
 * reservation-race.spec.ts's agent1/agent2, no such account with a known
 * password was seeded when this test was written, so credentials come
 * from the environment rather than being hardcoded:
 *
 *   TEST_MANAGER_EMAIL=... TEST_MANAGER_PASSWORD=... npx playwright test deals-funnel
 *
 * Skips itself if they're not set, same as beforeAll below.
 */

const EMAIL = process.env.TEST_MANAGER_EMAIL
const PASSWORD = process.env.TEST_MANAGER_PASSWORD

test.skip(!EMAIL || !PASSWORD, 'Set TEST_MANAGER_EMAIL/TEST_MANAGER_PASSWORD to run this test.')

let createdLeadId: number | null = null

test.afterEach(async ({ request }) => {
  // No delete endpoint exists (leads are permanent CRM history, not
  // scratch data) — best-effort mark it Lost so repeated runs don't pile
  // up "active" test leads on the real funnel.
  if (createdLeadId === null || !EMAIL || !PASSWORD) {
    return
  }
  const tokenRes = await request.post('/api/v1/auth/token', {
    data: { email: EMAIL, password: PASSWORD },
    headers: { Accept: 'application/json' },
  })
  const { plainTextToken } = await tokenRes.json()
  await request.post(`/api/leads/${createdLeadId}/transition`, {
    data: { stage: 'lost', lost_reason: 'other' },
    headers: { Authorization: `Bearer ${plainTextToken}`, Accept: 'application/json' },
  }).catch(() => null)
})

test('create a lead, drag it to Contacted, reload, stage persisted', async ({ page, request }) => {
  await page.goto('/agent/login')
  await page.getByLabel('Email').fill(EMAIL!)
  await page.getByLabel('Пароль').fill(PASSWORD!)
  await page.getByRole('button', { name: 'Войти' }).click()
  await page.waitForURL('**/agent/')

  await page.goto('/agent/deals')

  const contactName = `Playwright Test ${Date.now()}`
  await page.getByRole('button', { name: 'Новый лид' }).click()
  await page.getByLabel('Имя контакта').fill(contactName)
  await page.getByRole('button', { name: 'Добавить' }).click()

  const card = page.locator('div', { hasText: contactName }).last()
  await card.waitFor()

  // Drag the new card from the "Лиды" column into "Контакт" — vue-
  // draggable-plus/SortableJS both react to native HTML5 drag events,
  // which Playwright's dragTo() drives correctly (unlike a bare
  // mouse.move sequence, which SortableJS's own event listeners ignore).
  const contactedColumn = page.locator('h2', { hasText: 'Контакт' }).locator('..').locator('..')
  await card.dragTo(contactedColumn)

  // Confirm the drop actually reached the API, not just the local array —
  // read it back over the same GET /leads the board itself uses.
  const tokenRes = await request.post('/api/v1/auth/token', {
    data: { email: EMAIL, password: PASSWORD },
    headers: { Accept: 'application/json' },
  })
  const { plainTextToken } = await tokenRes.json()
  const leadsRes = await request.get('/api/leads', {
    headers: { Authorization: `Bearer ${plainTextToken}`, Accept: 'application/json' },
  })
  const { data: leads } = await leadsRes.json()
  const created = leads.find((l: { contactName: string }) => l.contactName === contactName)

  expect(created).toBeTruthy()
  expect(created.stage).toBe('contacted')
  createdLeadId = created.id

  // Reload to rule out the stage only living in Pinia's in-memory state.
  await page.reload()
  await expect(page.locator('h2', { hasText: 'Контакт' }).locator('..').locator('..').getByText(contactName)).toBeVisible()
})
