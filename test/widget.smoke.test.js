import { test } from 'node:test';
import assert from 'node:assert';

test('widget module imports without a DOM and exports mount + register', async () => {
  globalThis.window = undefined; // simulate no DOM
  const mod = await import('../src/widget.js');
  assert.strictEqual(typeof mod.mount, 'function');
  assert.strictEqual(typeof mod.register, 'function');
});
