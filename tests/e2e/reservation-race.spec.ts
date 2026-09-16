import { expect, test, type Page } from '@playwright/test'

/**
 * The roadmap's own Sprint 2 acceptance test: "two agents, one click within
 * ~200ms, exactly one success + one 409." This is the scenario
 * TransitionUnit's lockForUpdate() fix (see ihona-crm) exists for — without
 * it, both requests read status=available before either wrote and both
 * would succeed, silently double-booking the same unit.
 *
 * Runs against the live crm.ihona.tj backend using two of the seed agent
 * accounts (agent1@ihona.tj / agent2@ihona.tj, password AgentDemo2026!) so
 * it exercises the real MySQL row lock, not a mock. Picks whichever unit is
 * currently free rather than hardcoding one, and releases it again in an
 * afterEach so a re-run always starts clean.
 *
 * A reservation now requires a client_id (Client/ClientInteraction, added
 * after this test originally passed) — "Забронировать" opens ClientPicker
 * instead of firing the API directly, so the race is now: type a phone,
 * pick the (pre-seeded, shared) test client, then the two /reserve calls
 * actually fire. Using the SAME client for both agents deliberately: the
 * race is about the unit, not about client creation contending with itself.
 */

const PROJECT_ID = 1
const PASSWORD = 'AgentDemo2026!'
const AGENT_1 = { email: 'agent1@ihona.tj', password: PASSWORD }
const AGENT_2 = { email: 'agent2@ihona.tj', password: PASSWORD }
const TEST_CLIENT_PHONE = '+992900000099'
const TEST_CLIENT_NAME = 'Playwright Race Client'

let targetUnitId: number | null = null
let targetUnitLabel = ''
let targetSection = ''

async function login(page: Page, credentials: { email: string; password: string }) {
  await page.goto('/agent/login')
  await page.getByLabel('Email').fill(credentials.email)
  await page.getByLabel('Пароль').fill(credentials.password)
  await page.getByRole('button', { name: 'Войти' }).click()
  await page.waitForURL('**/agent/')
}

async function tokenFor(request: import('@playwright/test').APIRequestContext, credentials: { email: string; password: string }): Promise<string> {
  const res = await request.post('/api/v1/auth/token', {
    data: credentials,
    headers: { Accept: 'application/json' },
  })
  if (!res.ok()) {
    throw new Error(`Login failed for ${credentials.email}: ${res.status()} ${await res.text()}`)
  }
  const body = await res.json()

  return body.plainTextToken
}

test.beforeAll(async ({ request }) => {
  const token = await tokenFor(request, AGENT_1)

  const units = await request.get(`/api/projects/${PROJECT_ID}/units`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
  if (!units.ok()) {
    throw new Error(`Fetching units failed: ${units.status()} ${await units.text()}`)
  }
  const { data } = await units.json()
  const free = data.find((u: { status: string }) => u.status === 'free')
  test.skip(!free, 'No free unit available to race for — seed data may be exhausted.')
  targetUnitId = free.id
  targetUnitLabel = free.label
  targetSection = free.section

  // Ensure the shared test client exists so both agents find it in the
  // picker's search results rather than racing each other to create it.
  await request.post('/api/clients', {
    data: { phone: TEST_CLIENT_PHONE, name: TEST_CLIENT_NAME },
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  })
});

test.afterEach(async ({ request }) => {
  if (targetUnitId === null) {
    return
  }
  const token = await tokenFor(request, AGENT_1)
  // Best-effort: if agent1 didn't win the race, this 409s harmlessly —
  // the unit already belongs to agent2, who released it themselves in the
  // test body (or another run's cleanup already did).
  await request.post(`/api/units/${targetUnitId}/release`, {
    data: { reason: 'Playwright race-condition test cleanup' },
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  }).catch(() => null)
})

test('two agents booking the same unit within ~200ms: exactly one wins', async ({ browser }) => {
  const context1 = await browser.newContext()
  const context2 = await browser.newContext()
  const page1 = await context1.newPage()
  const page2 = await context2.newPage()

  await login(page1, AGENT_1)
  await login(page2, AGENT_2)

  await page1.goto(`/agent/projects/${PROJECT_ID}`)
  await page2.goto(`/agent/projects/${PROJECT_ID}`)

  // The grid only renders whichever section is currently selected — the
  // target unit's own section won't have a button in the DOM at all until
  // its tab is picked (the page defaults to the first section it happens
  // to see, not necessarily this one).
  await page1.getByRole('button', { name: targetSection, exact: true }).click()
  await page2.getByRole('button', { name: targetSection, exact: true }).click()

  await page1.locator('button', { hasText: targetUnitLabel }).click()
  await page2.locator('button', { hasText: targetUnitLabel }).click()

  await page1.getByRole('button', { name: 'Забронировать' }).waitFor()
  await page2.getByRole('button', { name: 'Забронировать' }).waitFor()

  // "Забронировать" now opens ClientPicker instead of calling the API
  // directly — both agents pick the same pre-seeded client here so the
  // race stays about the unit, not about which agent's client-search
  // request lands first.
  const pickClientAndOpenPicker = async (page: Page) => {
    await page.getByRole('button', { name: 'Забронировать' }).click()
    await page.getByPlaceholder('Телефон или имя').fill(TEST_CLIENT_PHONE)
    // ClientPicker debounces its search 250ms — give it room, then wait
    // for the pre-seeded client's result button to actually render.
    await page.getByRole('button', { name: new RegExp(TEST_CLIENT_NAME) }).waitFor({ timeout: 5000 })
  }

  await pickClientAndOpenPicker(page1)
  await pickClientAndOpenPicker(page2)

  // Fired together, not awaited one at a time — this is the actual race:
  // both requests should be in flight within the same ~200ms window the
  // roadmap describes, not sequential. click() itself only waits for the
  // event to dispatch, not for optimisticUpdate's network round-trip, so
  // each branch separately waits for its own toast to actually appear
  // before reading it.
  const readToast = async (page: Page) => {
    await page.getByRole('button', { name: new RegExp(TEST_CLIENT_NAME) }).click()
    const toast = page.locator('.pointer-events-auto').first()
    await toast.waitFor({ state: 'visible', timeout: 5000 })

    return toast.textContent()
  }

  const [toast1, toast2] = await Promise.all([readToast(page1), readToast(page2)])

  const results = [toast1 ?? '', toast2 ?? '']
  const successes = results.filter((t) => t.includes('успешно забронирована'))
  const conflicts = results.filter((t) => t.includes('Не удалось'))

  expect(successes).toHaveLength(1)
  expect(conflicts).toHaveLength(1)

  await context1.close()
  await context2.close()
})
