import { test } from 'node:test';
import assert from 'node:assert';
import { logoFor } from '../src/logos.js';

test('logoFor returns an inline svg for a known appId', () => {
  const svg = logoFor('bluesky', 'Bluesky');
  assert.ok(svg.includes('<svg'), 'is an svg');
  assert.ok(svg.includes('atmo-logo'), 'carries the class');
});

test('logoFor returns empty string when no appId', () => {
  assert.strictEqual(logoFor(undefined, 'Whatever'), '');
  assert.strictEqual(logoFor('', ''), '');
});

test('logoFor falls back to a monogram for an unmapped appId', () => {
  const svg = logoFor('someneapp', 'Foo');
  assert.ok(svg.includes('<svg'));
  assert.ok(svg.includes('>F<'), 'uses the first letter of the app name');
});
