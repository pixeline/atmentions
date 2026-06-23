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

test('renderReactorList renders avatars + names, linking to the reaction record', () => {
  const html = renderReactorList([{ did: 'did:plc:a', handle: 'alice.test', displayName: 'Alice', avatar: 'http://x/a.png', recordUri: 'at://did:plc:a/app.bsky.feed.like/1' }]);
  assert.ok(html.includes('Alice'));
  assert.ok(html.includes('http://x/a.png'));
  // a like has no public page -> pdsls record viewer, NOT the bare profile
  assert.ok(html.includes('https://pdsls.dev/at://did:plc:a/app.bsky.feed.like/1'), html);
});

test('reactorHref links a Bluesky post to the post page (not the profile)', async () => {
  const { reactorHref } = await import('../src/render.js');
  assert.strictEqual(
    reactorHref({ handle: 'pixeline.be', did: 'did:plc:v', recordUri: 'at://did:plc:v/app.bsky.feed.post/3abc' }),
    'https://bsky.app/profile/pixeline.be/post/3abc'
  );
});

test('empty reactions render a discreet default empty-state message', () => {
  const html = renderHTML({ total: 0, groups: [] }, { variant: 'default' });
  assert.ok(html.includes('atmo-empty'), 'has empty-state element');
  assert.ok(/ATmosphere/i.test(html), 'default copy mentions the ATmosphere');
});

test('empty reactions honor a custom empty-text (escaped)', () => {
  const html = renderHTML({ total: 0, groups: [] }, { variant: 'minimal', emptyText: 'Nothing <yet>' });
  assert.ok(html.includes('Nothing &lt;yet&gt;'), 'custom message present and HTML-escaped');
});

test('full variant: one row per group, app logo for known app + title, none for shared bookmark', () => {
  const reactions = { total: 3, groups: [
    { type: 'note', label: 'Notes', icon: '✍️', app: 'Margin', appId: 'margin', count: 2 },
    { type: 'lex-bookmark', label: 'Bookmarks', icon: '🔖', app: 'Bookmarks', count: 1 },
  ] };
  const html = renderHTML(reactions, { variant: 'full' });
  assert.ok(html.includes('atmo-rows'));
  assert.strictEqual((html.match(/data-atmo-expand=/g) || []).length, 2, 'one expandable row per group');
  // known app -> logo wrap with title
  assert.ok(html.includes('title="Margin"'), 'app name in title');
  assert.ok(html.includes('atmo-logo'), 'svg logo present for margin');
  // shared bookmark -> no logo wrap (no appId)
  assert.ok(!html.includes('title="Bookmarks"'), 'no logo/title for the shared bookmark');
});

test('full variant: empty reactions still show the empty-state', () => {
  assert.ok(renderHTML({ total: 0, groups: [] }, { variant: 'full' }).includes('atmo-empty'));
});

test('renders Lucide svg icons, not emoji, in default + full', () => {
  const reactions = { total: 1, groups: [{ type: 'note', label: 'Notes', icon: 'square-pen', app: 'Margin', appId: 'margin', count: 2 }] };
  const def = renderHTML(reactions, { variant: 'default' });
  assert.ok(def.includes('<svg class="atmo-icon"'), 'default chip uses an svg icon');
  assert.ok(!/[✍\u{1F4DD}\u{1F516}]/u.test(def), 'no note/bookmark emoji codepoints');
  const full = renderHTML(reactions, { variant: 'full' });
  assert.ok(full.includes('<svg class="atmo-icon"'), 'full row uses an svg icon');
});
