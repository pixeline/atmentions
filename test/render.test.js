import { test } from 'node:test';
import assert from 'node:assert';
import { renderHTML, renderReactorList } from '../src/render.js';

const reactions = { total: 8, groups: [
  { type: 'like', label: 'Likes', icon: '♥', app: 'Bluesky', count: 5, distinctDids: 5, collection: 'app.bsky.feed.like', path: '.subject.uri' },
  { type: 'recommend', label: 'Recommends', icon: '⭐', app: 'standard.site', count: 3, distinctDids: 3, collection: 'site.standard.graph.recommend', path: '.document' },
] };

test('default variant renders a chip per group with counts + expand hooks', () => {
  const html = renderHTML(reactions, { variant: 'default' });
  assert.ok(html.includes('data-atmo-expand="like"'));
  assert.ok(html.includes('>5<') || html.includes('>5</'));
  assert.ok(html.includes('Recommends'));
});

test('minimal variant renders a single aggregate control with total', () => {
  const html = renderHTML(reactions, { variant: 'minimal' });
  assert.ok(html.includes('data-atmo-toggle'));
  assert.ok(html.includes('8'));
});

test('renderReactorList renders avatars + handles as links', () => {
  const html = renderReactorList([{ did: 'did:plc:a', handle: 'alice.test', displayName: 'Alice', avatar: 'http://x/a.png', recordUri: 'at://did:plc:a/app.bsky.feed.like/1' }]);
  assert.ok(html.includes('alice.test'));
  assert.ok(html.includes('http://x/a.png'));
});

test('empty reactions render nothing visible (empty string container)', () => {
  assert.strictEqual(renderHTML({ total: 0, groups: [] }, { variant: 'default' }).trim(), '');
});
