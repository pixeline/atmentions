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

test('reactorProfileHref links to the profile (bsky for a handle, pdsls repo otherwise)', async () => {
  const { reactorProfileHref } = await import('../src/render.js');
  assert.strictEqual(reactorProfileHref({ handle: 'alex.test', did: 'did:plc:a' }), 'https://bsky.app/profile/alex.test');
  assert.strictEqual(reactorProfileHref({ handle: 'did:plc:a', did: 'did:plc:a' }), 'https://pdsls.dev/at://did:plc:a');
  assert.strictEqual(reactorProfileHref({ handle: '', did: 'did:plc:a' }), 'https://pdsls.dev/at://did:plc:a');
});

test('renderMentions composes per-person, groups by app, links verbs + name', async () => {
  const { renderMentions } = await import('../src/render.js');
  const actions = [
    { did: 'did:plc:a', handle: 'alex.test', displayName: 'Alexandre', avatar: '', recordUri: 'at://did:plc:a/app.bsky.feed.like/3k2', verb: 'liked', app: 'Bluesky', appId: 'bluesky' },
    { did: 'did:plc:a', handle: 'alex.test', displayName: 'Alexandre', avatar: '', recordUri: 'at://did:plc:a/app.bsky.feed.post/3k3', verb: 'replied to', app: 'Bluesky', appId: 'bluesky' },
    { did: 'did:plc:a', handle: 'alex.test', displayName: 'Alexandre', avatar: '', recordUri: 'at://did:plc:a/at.margin.bookmark/3k1', verb: 'bookmarked', app: 'Margin', appId: 'margin' },
  ];
  const html = renderMentions(actions, {});
  assert.ok(html.includes('atmo-mentions'));
  assert.ok(html.includes('this on Bluesky'), html);          // newest clause (Bluesky, max rkey 3k3) leads with "this"
  assert.ok(html.includes('it on Margin'), html);             // older clause uses "it"
  assert.ok(html.includes(', and '), 'clauses joined with comma+and');
  assert.ok(html.includes('>liked</a>') && html.includes('>replied to</a>') && html.includes('>bookmarked</a>'), 'each verb is a link');
  assert.ok(html.includes('liked</a> and <a'), 'two verbs in a clause joined with " and " (no comma)');
  assert.ok(html.includes('https://bsky.app/profile/alex.test'), 'name links to profile');
  assert.ok(html.includes('app.bsky.feed.like/3k2'), 'verb links to its own record (like → pdsls)');
});

test('renderMentions: single action collapses; no-app drops "on"; escapes', async () => {
  const { renderMentions } = await import('../src/render.js');
  const one = renderMentions([{ did: 'did:plc:m', handle: 'mondo.test', displayName: 'Mondo', avatar: '', recordUri: 'at://did:plc:m/app.bsky.feed.like/3kx', verb: 'liked', app: 'Bluesky', appId: 'bluesky' }], {});
  assert.ok(one.includes('this on Bluesky') && one.includes('Mondo'));
  const noApp = renderMentions([{ did: 'did:plc:b', handle: 'bob.test', displayName: 'Bob', avatar: '', recordUri: 'at://did:plc:b/community.lexicon.bookmarks.bookmark/3k9', verb: 'bookmarked', app: 'Bookmarks', appId: undefined }], {});
  assert.ok(!noApp.includes(' on Bookmarks'), 'no-appId action drops the "on {app}" clause');
  assert.ok(/bookmarked<\/a> this/.test(noApp), 'reads "… bookmarked this" with no app');
  const esc = renderMentions([{ did: 'did:plc:e', handle: 'x.test', displayName: '<b>Eve</b>', avatar: '', recordUri: 'at://did:plc:e/app.bsky.feed.like/3k', verb: 'liked', app: 'Bluesky', appId: 'bluesky' }], {});
  assert.ok(esc.includes('&lt;b&gt;Eve&lt;/b&gt;') && !esc.includes('<b>Eve</b>'), 'display name escaped');
});

test('renderMentions: people ordered newest-first by rkey; empty honors emptyText', async () => {
  const { renderMentions } = await import('../src/render.js');
  const html = renderMentions([
    { did: 'did:plc:old', handle: 'old.test', displayName: 'Older', avatar: '', recordUri: 'at://did:plc:old/app.bsky.feed.like/3aaa', verb: 'liked', app: 'Bluesky', appId: 'bluesky' },
    { did: 'did:plc:new', handle: 'new.test', displayName: 'Newer', avatar: '', recordUri: 'at://did:plc:new/app.bsky.feed.like/3zzz', verb: 'liked', app: 'Bluesky', appId: 'bluesky' },
  ], {});
  assert.ok(html.indexOf('Newer') < html.indexOf('Older'), 'newer rkey (3zzz) sorts first');
  const empty = renderMentions([], { emptyText: 'Nothing <yet>' });
  assert.ok(empty.includes('atmo-empty') && empty.includes('Nothing &lt;yet&gt;'));
});
