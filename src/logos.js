// Bundled inline SVG app marks — zero external requests, CSP-safe in Shadow DOM.
// Brand-colored monogram marks: APPROXIMATIONS; swap in official SVG paths anytime.
function mark(bg, letter, fg = '#ffffff') {
  const c = /^[a-z0-9]$/i.test(letter) ? letter.toUpperCase() : '?';
  return `<svg class="atmo-logo" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">`
    + `<rect width="16" height="16" rx="4" fill="${bg}"/>`
    + `<text x="8" y="11.5" text-anchor="middle" font-size="9" font-weight="700" font-family="system-ui,sans-serif" fill="${fg}">${c}</text></svg>`;
}

export const APP_LOGOS = {
  bluesky:           mark('#1185fe', 'b'),
  margin:            mark('#222222', 'M'),
  semble:            mark('#5b4ee5', 'S'),
  frontpage:         mark('#000000', 'F'),
  'standard-site':   mark('#1a7f5a', 'S'),
  'standard-reader': mark('#6b7280', 'R'),
  pckt:              mark('#e0563f', 'P'),
};

export function logoFor(appId, appName) {
  if (!appId) return '';
  if (APP_LOGOS[appId]) return APP_LOGOS[appId];
  const letter = String(appName || appId).trim().charAt(0) || '?';
  return mark('#9ca3af', letter);
}
