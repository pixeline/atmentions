// Bundled inline SVG app marks — zero external requests, CSP-safe in Shadow DOM.
// Real brand logos are inlined verbatim from the apps' own /logo.svg (sized to the
// 16px slot via viewBox; default preserveAspectRatio keeps them undistorted). Apps
// without a supplied official mark fall back to a brand-colored monogram via mark().
function mark(bg, letter, fg = '#ffffff') {
  const c = /^[a-z0-9]$/i.test(letter) ? letter.toUpperCase() : '?';
  return `<svg class="atmo-logo" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">`
    + `<rect width="16" height="16" rx="4" fill="${bg}"/>`
    + `<text x="8" y="11.5" text-anchor="middle" font-size="9" font-weight="700" font-family="system-ui,sans-serif" fill="${fg}">${c}</text></svg>`;
}

// margin.at — official mark (https://margin.at/logo.svg), single-color #027bff.
const MARGIN = `<svg class="atmo-logo" width="16" height="16" viewBox="0 0 265 231" fill="#027bff" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M0 230 V0 H199 V65.7156 H149.5 V115.216 H182.5 L199 131.716 V230 Z"/><path d="M215 214.224 V230 H264.5 V0 H215 V16.2242 H248.5 V214.224 H215 Z"/></svg>`;
// frontpage.fyi — official mark (https://frontpage.fyi/frontpage-logo.svg); gradient + dark-mode style preserved.
const FRONTPAGE = `<svg class="atmo-logo" width="16" height="16" viewBox="0 0 334 334" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><style>.atmo-fp-stop2{stop-color:#040818}@media (prefers-color-scheme:dark){.atmo-fp-stop2{stop-color:#fff}}</style><path d="M95 225.903V101L162 62.0968V32L69 86V241L95 225.903Z" fill="url(#atmo-fp-g0)"/><path d="M147 256.903V132L214 93.0968V63L121 117V272L147 256.903Z" fill="url(#atmo-fp-g1)"/><path d="M266 93V129L204 165V198L266 162V198L204 234V284L173 302V147L266 93Z" fill="url(#atmo-fp-g2)"/><defs><linearGradient id="atmo-fp-g0" x1="69" y1="84.5" x2="205.5" y2="167" gradientUnits="userSpaceOnUse"><stop stop-color="#2E05FF"/><stop class="atmo-fp-stop2" offset="1"/></linearGradient><linearGradient id="atmo-fp-g1" x1="69" y1="84.5" x2="205.5" y2="167" gradientUnits="userSpaceOnUse"><stop stop-color="#2E05FF"/><stop class="atmo-fp-stop2" offset="1"/></linearGradient><linearGradient id="atmo-fp-g2" x1="69" y1="84.5" x2="205.5" y2="167" gradientUnits="userSpaceOnUse"><stop stop-color="#2E05FF"/><stop class="atmo-fp-stop2" offset="1"/></linearGradient></defs></svg>`;

export const APP_LOGOS = {
  bluesky:           mark('#1185fe', 'b'),
  margin:            MARGIN,
  semble:            mark('#5b4ee5', 'S'),
  frontpage:         FRONTPAGE,
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
