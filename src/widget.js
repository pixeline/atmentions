import { fetchReactions, resolveReactors } from './index.js';
import { renderHTML, renderReactorList } from './render.js';
import { STYLE } from './widget.css.js';

const hasDOM = typeof window !== 'undefined' && typeof window.HTMLElement !== 'undefined';

function readSubjects(el) {
  return {
    url: el.getAttribute('data-url') || el.getAttribute('url') || (typeof location !== 'undefined' ? location.href : ''),
    aturi: el.getAttribute('data-aturi') || el.getAttribute('aturi') || undefined,
    bsky: el.getAttribute('data-bsky') || el.getAttribute('bsky') || undefined,
  };
}

export async function mount(el, opts = {}) {
  const root = el.shadowRoot || el.attachShadow({ mode: 'open' });
  const variant = el.getAttribute('variant') || 'default';
  root.innerHTML = `<style>${STYLE}</style><div data-atmo-host></div>`;
  const host = root.querySelector('[data-atmo-host]');
  const subjects = readSubjects(el);
  let reactions;
  try { reactions = await fetchReactions(subjects, opts); }
  catch { return; } // never throw into host; leave empty
  host.innerHTML = renderHTML(reactions, { variant });
  // expand handlers (event delegation)
  const expand = async (type, panel, btn) => {
    if (panel.dataset.loaded) { panel.hidden = !panel.hidden; btn && btn.setAttribute('aria-expanded', String(!panel.hidden)); return; }
    const group = reactions.groups.find((g) => g.type === type);
    panel.innerHTML = 'Loading…';
    const reactors = group ? await resolveReactors(group, subjects, opts).catch(() => []) : [];
    panel.innerHTML = renderReactorList(reactors);
    panel.dataset.loaded = '1'; panel.hidden = false; btn && btn.setAttribute('aria-expanded', 'true');
  };
  host.addEventListener('click', async (e) => {
    const chip = e.target.closest('[data-atmo-expand]');
    if (chip) { const type = chip.getAttribute('data-atmo-expand'); return expand(type, host.querySelector(`[data-atmo-panel="${CSS.escape(type)}"]`), chip); }
    const toggle = e.target.closest('[data-atmo-toggle]');
    if (toggle) {
      const panel = host.querySelector('[data-atmo-allpanel]');
      if (!panel.dataset.loaded) { panel.innerHTML = reactions.groups.map((g) => `<strong>${g.icon} ${g.count}</strong> ${g.label}`).join(' · '); panel.dataset.loaded = '1'; }
      panel.hidden = !panel.hidden; toggle.setAttribute('aria-expanded', String(!panel.hidden));
    }
  });
}

export function register() {
  if (!hasDOM || customElements.get('atmentions-reactions')) return;
  class ATmentionsReactions extends window.HTMLElement { connectedCallback() { mount(this).catch(() => {}); } }
  customElements.define('atmentions-reactions', ATmentionsReactions);
}

if (hasDOM) {
  register();
  const init = () => document.querySelectorAll('[data-atmentions]').forEach((el) => mount(el).catch(() => {}));
  if (document.readyState !== 'loading') init(); else document.addEventListener('DOMContentLoaded', init);
}
