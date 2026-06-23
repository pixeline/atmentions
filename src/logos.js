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

// Bluesky — official butterfly (bsky.app); ships as currentColor, rendered in
// brand blue #1185fe here so it reads as Bluesky rather than the row's text color.
const BLUESKY = `<svg class="atmo-logo" width="16" height="16" viewBox="0 0 568 501" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill="#1185fe" d="M123.121 33.664C188.241 82.553 258.281 181.68 284 234.873c25.719-53.192 95.759-152.32 160.879-201.21C491.866-1.611 568-28.906 568 57.947c0 17.346-9.945 145.713-15.778 166.555-20.275 72.453-94.155 90.933-159.875 79.748C507.222 323.8 536.444 388.56 473.333 453.32c-119.86 122.992-172.272-30.859-185.702-70.281-2.462-7.227-3.614-10.608-3.631-7.733-.017-2.875-1.169.506-3.631 7.733-13.43 39.422-65.842 193.273-185.702 70.281-63.111-64.76-33.89-129.52 80.986-149.071-65.72 11.185-139.6-7.295-159.875-79.748C9.945 203.659 0 75.291 0 57.946 0-28.906 76.135-1.612 123.121 33.664Z"/></svg>`;
// Semble — official mark (semble.so), brand orange #FF6400.
const SEMBLE = `<svg class="atmo-logo" width="16" height="16" viewBox="0 0 32 43" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M31.0164 33.1306C31.0164 38.581 25.7882 42.9994 15.8607 42.9994C5.93311 42.9994 0 37.5236 0 32.0732C0 26.6228 5.93311 23.2617 15.8607 23.2617C25.7882 23.2617 31.0164 27.6802 31.0164 33.1306Z" fill="#FF6400"/><path d="M25.7295 19.3862C25.7295 22.5007 20.7964 22.2058 15.1558 22.2058C9.51511 22.2058 4.93445 22.1482 4.93445 19.0337C4.93445 15.9192 9.71537 12.6895 15.356 12.6895C20.9967 12.6895 25.7295 16.2717 25.7295 19.3862Z" fill="#FF6400"/><path d="M25.0246 10.9256C25.0246 14.0401 20.7964 11.9829 15.1557 11.9829C9.51506 11.9829 6.34424 13.6876 6.34424 10.5731C6.34424 7.45857 9.51506 5.63867 15.1557 5.63867C20.7964 5.63867 25.0246 7.81103 25.0246 10.9256Z" fill="#FF6400"/><path d="M20.4426 3.5755C20.4426 5.8323 18.2088 4.22951 15.2288 4.22951C12.2489 4.22951 10.5737 5.8323 10.5737 3.5755C10.5737 1.31871 12.2489 0 15.2288 0C18.2088 0 20.4426 1.31871 20.4426 3.5755Z" fill="#FF6400"/></svg>`;
// standard.site — official mark; uses currentColor (theme-adaptive), kept as-is.
const STANDARD_SITE = `<svg class="atmo-logo" width="16" height="16" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path fill-rule="evenodd" clip-rule="evenodd" d="M13.7848 0.065714C13.9147 -0.0219047 14.0853 -0.0219047 14.2152 0.065714C14.3672 0.16831 14.4487 1.17325 14.6113 3.18324L14.6679 3.88175H18.5308C21.5884 3.88179 24.067 6.36063 24.067 9.41828V10.3728H22.1579V9.41828C22.1579 7.415 20.5341 5.79089 18.5308 5.79086H14.8257C14.9975 7.72432 15.1695 8.84869 15.6731 9.76909C16.2205 10.7696 17.0392 11.5976 18.0361 12.1592C19.167 12.7962 20.6187 12.9381 23.522 13.2213L25.1166 13.3766C26.9289 13.5534 27.8355 13.6419 27.9364 13.793C28.0224 13.9222 28.0211 14.0905 27.933 14.2184C27.83 14.368 26.9222 14.4423 25.107 14.5906L24.067 14.6755V18.5819C24.0669 21.6396 21.5884 24.1181 18.5308 24.1182H14.6632L14.6113 24.7719C14.4489 26.8111 14.3676 27.831 14.2155 27.9342C14.0855 28.0219 13.9148 28.0219 13.7848 27.9342C13.6327 27.8315 13.5514 26.8117 13.389 24.7719L13.3368 24.1182H9.36726C6.30968 24.1181 3.83082 21.6395 3.83079 18.5819V17.6274H5.73987V18.5819C5.73991 20.5852 7.36404 22.209 9.36726 22.209H13.1814C13.0072 20.202 12.8353 19.0446 12.3157 18.1037C11.7575 17.0929 10.9223 16.2602 9.90699 15.7024C8.75503 15.0696 7.27799 14.9489 4.32422 14.7075L2.89302 14.5906C1.07778 14.4423 0.170021 14.368 0.0669912 14.2184C-0.0210463 14.0905 -0.0224419 13.9222 0.0635733 13.793C0.164352 13.6418 1.07092 13.5534 2.88339 13.3766L3.83079 13.284V9.41828C3.83079 6.36064 6.30966 3.8818 9.36726 3.88175H13.3324L13.389 3.18324C13.5515 1.17355 13.6328 0.168553 13.7848 0.065714ZM22.1579 14.8352C20.1779 15.0125 19.0285 15.1887 18.0933 15.7024C17.0779 16.2602 16.2425 17.0929 15.6843 18.1037C15.1647 19.0446 14.9928 20.202 14.8186 22.209H18.5308C20.534 22.209 22.1578 20.5852 22.1579 18.5819V14.8352ZM9.36726 5.79086C7.36401 5.7909 5.73987 7.41501 5.73987 9.41828V13.0957C7.82821 12.8811 9.01013 12.6965 9.96385 12.1592C10.9608 11.5976 11.7795 10.7696 12.3269 9.76909C12.8305 8.84869 13.0028 7.72433 13.1746 5.79086H9.36726Z" fill="currentColor"/></svg>`;

export const APP_LOGOS = {
  bluesky:           BLUESKY,
  margin:            MARGIN,
  semble:            SEMBLE,
  frontpage:         FRONTPAGE,
  'standard-site':   STANDARD_SITE,
  'standard-reader': mark('#6b7280', 'R'),
  pckt:              mark('#e0563f', 'P'),
};

export function logoFor(appId, appName) {
  if (!appId) return '';
  if (APP_LOGOS[appId]) return APP_LOGOS[appId];
  const letter = String(appName || appId).trim().charAt(0) || '?';
  return mark('#9ca3af', letter);
}
