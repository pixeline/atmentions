import { test } from 'node:test';
import assert from 'node:assert';
import { iconFor } from '../src/icons.js';

test('iconFor returns an inline atmo-icon svg for a known name', () => {
  const svg = iconFor('bookmark');
  assert.ok(svg.includes('<svg'), 'is an svg');
  assert.ok(svg.includes('atmo-icon'), 'has the class');
  assert.ok(svg.includes('currentColor'), 'inherits color');
});

test('iconFor falls back to the circle icon for an unknown name', () => {
  const fallback = iconFor('totally-unknown-xyz');
  assert.ok(fallback.includes('<svg'));
  assert.strictEqual(fallback, iconFor('circle'), 'unknown -> circle');
});
