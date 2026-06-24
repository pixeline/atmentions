import { logoFor } from './logos.js';
import { iconFor } from './icons.js';

export function esc(s) {
  return String(s == null ? '' : s).replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
  );
}

// Link a reactor to their actual reaction RECORD, not just their profile:
// a Bluesky post → the post page (which already shows the author); any other
// record type → pdsls.dev (a valid viewer for records with no public web page).
export function reactorHref(r) {
  const m = String(r.recordUri || '').match(/^at:\/\/([^/]+)\/([^/]+)\/(.+)$/);
  if (m) {
    const [, did, collection, rkey] = m;
    if (collection === 'app.bsky.feed.post') {
      const who = r.handle && r.handle.includes('.') ? r.handle : did;
      return `https://bsky.app/profile/${who}/post/${rkey}`;
    }
    return `https://pdsls.dev/at://${did}/${collection}/${rkey}`;
  }
  return r.handle && r.handle.includes('.')
    ? `https://bsky.app/profile/${r.handle}`
    : '#';
}

// Link a reactor to their PROFILE (not a specific record): a real handle → their
// Bluesky profile; an unresolved handle (a bare DID) → their pdsls repo view.
export function reactorProfileHref(r) {
  if (r.handle && r.handle.includes('.'))
    return `https://bsky.app/profile/${r.handle}`;
  return `https://pdsls.dev/at://${r.did}`;
}

export function renderReactorList(reactors) {
  if (!reactors || !reactors.length) return '<p class="muted">No one yet.</p>';
  return (
    '<ul class="list">' +
    reactors
      .map((r) => {
        const name = esc(r.displayName || r.handle || r.did);
        const av = r.avatar
          ? `<img src="${esc(r.avatar)}" alt="" loading="lazy">`
          : '';
        return `<li><a href="${esc(reactorHref(r))}" target="_blank" rel="noopener">${av}<span>${name}</span></a></li>`;
      })
      .join('') +
    '</ul>'
  );
}

export const DEFAULT_EMPTY = 'No ripples in the ATmosphere yet.';

const rkeyOf = (uri) =>
  String(uri || '')
    .split('/')
    .pop() || '';
// verb join: no comma for two ("a and b"); Oxford for 3+.
function joinVerbs(p) {
  return p.length <= 1
    ? p.join('')
    : p.length === 2
      ? p[0] + ' and ' + p[1]
      : p.slice(0, -1).join(', ') + ', and ' + p[p.length - 1];
}
// clause join: comma even for two ("a, and b"); Oxford for 3+.
function joinClauses(p) {
  return p.length <= 1
    ? p.join('')
    : p.slice(0, -1).join(', ') + ', and ' + p[p.length - 1];
}

export function renderMentions(actions, { emptyText = DEFAULT_EMPTY } = {}) {
  if (!actions || !actions.length)
    return `<div class="wrap"><p class="atmo-empty">${esc(emptyText)}</p></div>`;
  const byDid = new Map();
  for (const a of actions) {
    if (!byDid.has(a.did)) byDid.set(a.did, []);
    byDid.get(a.did).push(a);
  }
  const people = [...byDid.values()].map((acts) => ({
    acts,
    maxRkey: acts.reduce(
      (m, a) => (rkeyOf(a.recordUri) > m ? rkeyOf(a.recordUri) : m),
      '',
    ),
  }));
  people.sort((a, b) =>
    a.maxRkey < b.maxRkey ? 1 : a.maxRkey > b.maxRkey ? -1 : 0,
  ); // people newest-first

  const line = ({ acts }) => {
    const first = acts[0];
    const name = esc(first.displayName || first.handle || first.did);
    const profile = esc(reactorProfileHref(first));
    const avatar = first.avatar
      ? `<a class="atmo-m-av" href="${profile}" target="_blank" rel="noopener"><img src="${esc(first.avatar)}" alt="" loading="lazy"></a>`
      : '';
    const byApp = new Map();
    for (const a of acts) {
      const k = a.appId || '';
      if (!byApp.has(k)) byApp.set(k, []);
      byApp.get(k).push(a);
    }
    const clauses = [...byApp.entries()].map(([appId, list]) => {
      list.sort((x, y) => (rkeyOf(x.recordUri) < rkeyOf(y.recordUri) ? -1 : 1)); // verbs oldest-first (chronological reading)
      const verbs = list.map(
        (a) =>
          `<a href="${esc(reactorHref(a))}" target="_blank" rel="noopener">${esc(a.verb)}</a>`,
      );
      const maxRkey = list.reduce(
        (m, a) => (rkeyOf(a.recordUri) > m ? rkeyOf(a.recordUri) : m),
        '',
      );
      return { verbs, app: appId ? ` on ${esc(list[0].app)}` : '', maxRkey };
    });
    clauses.sort((a, b) =>
      a.maxRkey < b.maxRkey ? 1 : a.maxRkey > b.maxRkey ? -1 : 0,
    ); // clauses newest-first
    const text = joinClauses(
      clauses.map(
        (c, i) => `${joinVerbs(c.verbs)} ${i === 0 ? 'this' : 'it'}${c.app}`,
      ),
    );
    return `<li class="atmo-m">${avatar}<span class="atmo-m-body"><a class="atmo-m-name" href="${profile}" target="_blank" rel="noopener">${name}</a> ${text}</span></li>`;
  };

  return `<div class="wrap"><ul class="atmo-mentions">${people.map(line).join('')}</ul></div>`;
}

export function renderHTML(
  reactions,
  { variant = 'default', emptyText = DEFAULT_EMPTY } = {},
) {
  if (!reactions || !reactions.total)
    return `<div class="wrap"><p class="atmo-empty">${esc(emptyText)}</p></div>`;
  const chip = (g) =>
    `<button type="button" class="chip" data-atmo-expand="${esc(g.type)}" aria-expanded="false">${iconFor(g.icon)}<span class="n">${g.count}</span><span class="lbl">${esc(g.label)}</span></button><div class="panel" data-atmo-panel="${esc(g.type)}" hidden></div>`;
  if (variant === 'minimal') {
    return `<div class="wrap"><button type="button" class="toggle" data-atmo-toggle aria-expanded="false">${iconFor('sparkles')} ${reactions.total} ATmosphere reactions</button><div class="panel" data-atmo-allpanel hidden></div></div>`;
  }
  if (variant === 'full') {
    const row = (g) => {
      const logo = g.appId
        ? `<span class="atmo-logowrap" title="${esc(g.app)}">${logoFor(g.appId, g.app)}</span>`
        : '';
      return (
        `<button type="button" class="atmo-row" data-atmo-expand="${esc(g.type)}" aria-expanded="false">` +
        `${logo}${iconFor(g.icon)}` +
        `<span class="n">${g.count}</span><span class="lbl">${esc(g.label)}</span></button>` +
        `<div class="panel" data-atmo-panel="${esc(g.type)}" hidden></div>`
      );
    };
    return `<div class="wrap"><div class="atmo-rows">${reactions.groups.map(row).join('')}</div></div>`;
  }
  return `<div class="wrap"><div class="chips">${reactions.groups.map(chip).join('')}</div></div>`;
}
