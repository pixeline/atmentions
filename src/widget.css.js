export const STYLE = `
:host { --atmo-fg:#3d3c3c; --atmo-muted:#777; --atmo-accent:#f7b4ed; --atmo-bg:transparent; --atmo-radius:.5rem; display:block; }
:host([appearance="dark"]) { --atmo-fg:#eee; --atmo-muted:#aaa; --atmo-bg:transparent; }
.wrap { font: 14px/1.4 system-ui, sans-serif; color: var(--atmo-fg); }
.chips { display:flex; flex-wrap:wrap; gap:.5rem; align-items:center; }
.chip { display:inline-flex; gap:.35rem; align-items:center; border:1px solid color-mix(in srgb, var(--atmo-fg) 18%, transparent); background:var(--atmo-bg); border-radius:999px; padding:.25rem .6rem; cursor:pointer; font:inherit; color:inherit; }
.chip:hover, .chip:focus-visible { border-color:var(--atmo-accent); outline:none; }
.chip .n { font-weight:700; }
.chip .lbl { color:var(--atmo-muted); }
.toggle { background:none; border:1px solid color-mix(in srgb, var(--atmo-fg) 18%, transparent); border-radius:999px; padding:.25rem .7rem; cursor:pointer; font:inherit; color:inherit; }
.list { list-style:none; margin:.6rem 0 0; padding:0; display:flex; flex-wrap:wrap; gap:.5rem; }
.list a { display:inline-flex; gap:.35rem; align-items:center; text-decoration:none; color:inherit; }
.list img { width:22px; height:22px; border-radius:50%; }
.panel[hidden] { display:none; }
@media (prefers-reduced-motion: no-preference) { .panel { transition: opacity .15s; } }
`;
