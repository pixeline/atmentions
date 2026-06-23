import { build } from 'esbuild';
import { mkdirSync } from 'node:fs';
mkdirSync('dist', { recursive: true });
const common = { bundle: true, format: 'esm', target: 'es2020', logLevel: 'info' };
await build({ ...common, entryPoints: ['src/index.js'], outfile: 'dist/atmentions.esm.js' });
await build({ ...common, entryPoints: ['src/widget.js'], outfile: 'dist/atmentions.widget.esm.js' });
await build({ ...common, format: 'iife', minify: true, entryPoints: ['src/widget.js'], outfile: 'dist/atmentions.min.js' });
console.log('built dist/');
