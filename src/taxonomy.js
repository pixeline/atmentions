// key = `${collection}` (path appended only when a collection has >1 meaningful path)
const KNOWN = {
  'app.bsky.feed.like':                 { type: 'like',      label: 'Likes',      icon: '♥',  app: 'Bluesky' },
  'app.bsky.feed.repost':               { type: 'repost',    label: 'Reposts',    icon: '🔁', app: 'Bluesky' },
  'site.standard.graph.recommend':      { type: 'recommend', label: 'Recommends', icon: '⭐', app: 'standard.site' },
  'app.standard-reader.read':           { type: 'read',      label: 'Reads',      icon: '📖', app: 'standard-reader' },
  'app.standard-reader.bookmark':       { type: 'bookmark',  label: 'Bookmarks',  icon: '🔖', app: 'standard-reader' },
  'fyi.unravel.frontpage.post':         { type: 'frontpage', label: 'Frontpage',  icon: '📰', app: 'Frontpage' },
  'at.margin.note':                     { type: 'note',      label: 'Notes',      icon: '✍️', app: 'Margin' },
  'at.margin.bookmark':                 { type: 'bookmark',  label: 'Bookmarks',  icon: '🔖', app: 'Margin' },
  'network.cosmik.card':                { type: 'card',      label: 'Saves',      icon: '🗂️', app: 'Semble' },
};
// app.bsky.feed.post needs the path to disambiguate reply vs quote
const KNOWN_WITH_PATH = {
  'app.bsky.feed.post|.reply.parent.uri': { type: 'reply', label: 'Replies', icon: '💬', app: 'Bluesky' },
  'app.bsky.feed.post|.embed.record.uri': { type: 'quote', label: 'Quotes',  icon: '❝',  app: 'Bluesky' },
};

export function humanizeNsid(collection) {
  const last = String(collection).split('.').pop() || collection;
  return last.charAt(0).toUpperCase() + last.slice(1);
}

export function describe(collection, path) {
  const withPath = KNOWN_WITH_PATH[`${collection}|${path}`];
  if (withPath) return withPath;
  if (KNOWN[collection]) return KNOWN[collection];
  const parts = String(collection).split('.');
  const app = parts.slice(0, -1).join('.') || collection;
  return { type: `${collection}${path}`, label: humanizeNsid(collection), icon: '◇', app };
}
