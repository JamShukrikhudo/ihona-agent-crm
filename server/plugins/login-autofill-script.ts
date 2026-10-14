// useHead({ script: [...] }) in app/pages/login.vue silently failed to
// reach the rendered HTML (compiled into the SSR chunk correctly, called
// unconditionally in setup(), but never showed up in the response — likely
// a head-context mismatch between the app's `unhead`/`@unhead/vue`
// instances, not worth chasing further). Injecting the same inline script
// directly into the HTML string via this Nitro hook sidesteps unhead
// entirely and is guaranteed to land in <head> before any app JS runs,
// which is the whole point: it has to be in place before Chrome's
// autofill can fire (see the comment in login.vue for the full story).
const AUTOFILL_SCRIPT = `<script>(function () {
  window.__autofill = window.__autofill || {};
  document.addEventListener('animationstart', function (e) {
    if (e.animationName !== 'autofill-detect' || !e.target || e.target.tagName !== 'INPUT') return;
    window.__autofill[e.target.type] = e.target.value;
    window.dispatchEvent(new CustomEvent('autofill-sync'));
  }, true);
})();</script>`

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', (html, { event }) => {
    if (event.path?.includes('login')) {
      html.head.push(AUTOFILL_SCRIPT)
    }
  })
})
