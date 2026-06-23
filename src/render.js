function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

export function renderReactorList(reactors) {
  if (!reactors || !reactors.length) return '<p class="muted">No one yet.</p>';
  return '<ul class="list">' + reactors.map((r) => {
    const href = r.handle && r.handle.includes('.') ? `https://bsky.app/profile/${esc(r.handle)}` : `https://pdsls.dev/${esc(r.recordUri)}`;
    const name = esc(r.displayName || r.handle || r.did);
    const av = r.avatar ? `<img src="${esc(r.avatar)}" alt="" loading="lazy">` : '';
    return `<li><a href="${href}" target="_blank" rel="noopener">${av}<span>${name}</span></a></li>`;
  }).join('') + '</ul>';
}

export function renderHTML(reactions, { variant = 'default' } = {}) {
  if (!reactions || !reactions.total) return '';
  const chip = (g) => `<button type="button" class="chip" data-atmo-expand="${esc(g.type)}" aria-expanded="false"><span aria-hidden="true">${esc(g.icon)}</span><span class="n">${g.count}</span><span class="lbl">${esc(g.label)}</span></button><div class="panel" data-atmo-panel="${esc(g.type)}" hidden></div>`;
  if (variant === 'minimal') {
    return `<div class="wrap"><button type="button" class="toggle" data-atmo-toggle aria-expanded="false">◇ ${reactions.total} ATmosphere reactions</button><div class="panel" data-atmo-allpanel hidden></div></div>`;
  }
  return `<div class="wrap"><div class="chips">${reactions.groups.map(chip).join('')}</div></div>`;
}
