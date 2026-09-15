import { defineConfig } from '@playwright/test'

// Runs against the real deployed backend (crm.ihona.tj), not a local dev
// server — the whole point of the race-condition test is exercising the
// actual Reverb/MySQL/nginx stack the race bug lived in, not a mock. Test
// data (agent1..agent5@ihona.tj, the chessboard seed) already exists there.
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  fullyParallel: false,
  retries: 0,
  use: {
    // Origin only, not .../agent: a leading-slash path passed to page.goto()
    // or request.post() resolves against the URL's origin per WHATWG rules,
    // dropping any path baseURL itself carries — every path in this suite
    // spells out /agent/... explicitly instead of relying on it being
    // implied, to avoid exactly that footgun.
    baseURL: 'https://crm.ihona.tj',
    trace: 'retain-on-failure',
  },
})
