import { fetchReactions, resolveReactors } from './index.js';
import {
  renderHTML,
  renderReactorList,
  renderMentions,
  esc,
} from './render.js';
import { iconFor } from './icons.js';
import { STYLE } from './widget.css.js';

const hasDOM =
  typeof window !== 'undefined' && typeof window.HTMLElement !== 'undefined';

function readSubjects(el) {
  return {
    url:
      el.getAttribute('data-url') ||
      el.getAttribute('url') ||
      (typeof location !== 'undefined' ? location.href : ''),
    aturi:
      el.getAttribute('data-aturi') || el.getAttribute('aturi') || undefined,
    bsky: el.getAttribute('data-bsky') || el.getAttribute('bsky') || undefined,
  };
}

export async function mount(el, opts = {}) {
  const root = el.shadowRoot || el.attachShadow({ mode: 'open' });
  const variant = el.getAttribute('variant') || 'default';
  const emptyText = el.getAttribute('empty-text') || undefined;
  const hideEmpty = el.hasAttribute('hide-empty');
  root.innerHTML = `<style>${STYLE}</style><div data-atmo-host></div>`;
  const host = root.querySelector('[data-atmo-host]');
  const subjects = readSubjects(el);
  let reactions;
  try {
    reactions = await fetchReactions(subjects, opts);
  } catch {
    return;
  } // never throw into host; leave empty
  if (variant === 'mentions') {
    if (hideEmpty && (!reactions || !reactions.total)) {
      host.innerHTML = '';
      return;
    }
    host.innerHTML =
      '<div class="wrap"><p class="muted">Reading the ATmosphere…</p></div>'; // immediate feedback, never blank
    const groups = (reactions && reactions.groups) || [];
    const nested = await Promise.all(
      groups.map((g) =>
        resolveReactors(g, subjects, opts)
          .catch(() => [])
          .then((rs) =>
            rs.map((r) => ({ ...r, verb: g.verb, app: g.app, appId: g.appId })),
          ),
      ),
    );
    host.innerHTML = renderMentions(nested.flat(), { emptyText });
    return; // no click-to-expand for mentions
  }
  host.innerHTML =
    hideEmpty && (!reactions || !reactions.total)
      ? ''
      : renderHTML(reactions, { variant, emptyText });
  // expand handlers (event delegation)
  const expand = async (type, panel, btn) => {
    if (panel.dataset.loaded) {
      panel.hidden = !panel.hidden;
      btn && btn.setAttribute('aria-expanded', String(!panel.hidden));
      return;
    }
    const group = reactions.groups.find((g) => g.type === type);
    // Reveal the panel + "Loading…" BEFORE the network await, so the click has
    // immediate feedback. (Otherwise the panel stays hidden for the duration of
    // resolveReactors() and the chip feels dead — unlike the synchronous minimal
    // breakdown.) The reactor list then swaps in when it resolves.
    panel.innerHTML = 'Loading…';
    panel.hidden = false;
    btn && btn.setAttribute('aria-expanded', 'true');
    const reactors = group
      ? await resolveReactors(group, subjects, opts).catch(() => [])
      : [];
    panel.innerHTML = renderReactorList(reactors);
    panel.dataset.loaded = '1';
  };
  host.addEventListener('click', async (e) => {
    const chip = e.target.closest('[data-atmo-expand]');
    if (chip) {
      const type = chip.getAttribute('data-atmo-expand');
      return expand(
        type,
        host.querySelector(`[data-atmo-panel="${CSS.escape(type)}"]`),
        chip,
      );
    }
    const toggle = e.target.closest('[data-atmo-toggle]');
    if (toggle) {
      const panel = host.querySelector('[data-atmo-allpanel]');
      if (!panel.dataset.loaded) {
        panel.innerHTML = reactions.groups
          .map(
            (g) =>
              `<strong>${iconFor(g.icon)} ${g.count}</strong> ${esc(g.label)}`,
          )
          .join(' · ');
        panel.dataset.loaded = '1';
      }
      panel.hidden = !panel.hidden;
      toggle.setAttribute('aria-expanded', String(!panel.hidden));
    }
  });
}

export function register() {
  if (!hasDOM || customElements.get('atmentions-reactions')) return;
  class ATmentionsReactions extends window.HTMLElement {
    connectedCallback() {
      mount(this).catch(() => {});
    }
  }
  customElements.define('atmentions-reactions', ATmentionsReactions);
}

if (hasDOM) {
  register();
  const init = () =>
    document
      .querySelectorAll('[data-atmentions]')
      .forEach((el) => mount(el).catch(() => {}));
  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
}
