export function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

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
  return r.handle && r.handle.includes('.') ? `https://bsky.app/profile/${r.handle}` : '#';
}

export function renderReactorList(reactors) {
  if (!reactors || !reactors.length) return '<p class="muted">No one yet.</p>';
  return '<ul class="list">' + reactors.map((r) => {
    const name = esc(r.displayName || r.handle || r.did);
    const av = r.avatar ? `<img src="${esc(r.avatar)}" alt="" loading="lazy">` : '';
    return `<li><a href="${esc(reactorHref(r))}" target="_blank" rel="noopener">${av}<span>${name}</span></a></li>`;
  }).join('') + '</ul>';
}

export const DEFAULT_EMPTY = 'No ripples in the ATmosphere yet.';

export function renderHTML(reactions, { variant = 'default', emptyText = DEFAULT_EMPTY } = {}) {
  if (!reactions || !reactions.total) return `<div class="wrap"><p class="atmo-empty">${esc(emptyText)}</p></div>`;
  const chip = (g) => `<button type="button" class="chip" data-atmo-expand="${esc(g.type)}" aria-expanded="false"><span aria-hidden="true">${esc(g.icon)}</span><span class="n">${g.count}</span><span class="lbl">${esc(g.label)}</span></button><div class="panel" data-atmo-panel="${esc(g.type)}" hidden></div>`;
  if (variant === 'minimal') {
    return `<div class="wrap"><button type="button" class="toggle" data-atmo-toggle aria-expanded="false">◇ ${reactions.total} ATmosphere reactions</button><div class="panel" data-atmo-allpanel hidden></div></div>`;
  }
  return `<div class="wrap"><div class="chips">${reactions.groups.map(chip).join('')}</div></div>`;
}
