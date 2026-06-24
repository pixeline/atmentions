// key = `${collection}` (path appended only when a collection has >1 meaningful path)
const KNOWN = {
  'app.bsky.feed.like':                   { type: 'like',      label: 'Likes',      icon: 'heart',  app: 'Bluesky',          appId: 'bluesky', verb: 'liked' },
  'app.bsky.feed.repost':                 { type: 'repost',    label: 'Reposts',    icon: 'repeat-2', app: 'Bluesky',          appId: 'bluesky', verb: 'reposted' },
  'site.standard.graph.recommend':        { type: 'recommend', label: 'Recommends', icon: 'star', app: 'standard.site',     appId: 'standard-site', verb: 'recommended' },
  'app.standard-reader.read':             { type: 'read',      label: 'Reads',      icon: 'book-open', app: 'standard-reader',  appId: 'standard-reader', verb: 'read' },
  'app.standard-reader.bookmark':         { type: 'bookmark',  label: 'Bookmarks',  icon: 'bookmark', app: 'standard-reader',  appId: 'standard-reader', verb: 'bookmarked' },
  'fyi.unravel.frontpage.post':           { type: 'frontpage', label: 'Frontpage',  icon: 'newspaper', app: 'Frontpage',        appId: 'frontpage', verb: 'posted' },
  'at.margin.note':                       { type: 'note',      label: 'Notes',      icon: 'square-pen', app: 'Margin',           appId: 'margin', verb: 'annotated' },
  'at.margin.bookmark':                   { type: 'margin-bookmark', label: 'Bookmarks', icon: 'bookmark', app: 'Margin',      appId: 'margin', verb: 'bookmarked' },
  'network.cosmik.card':                  { type: 'card',      label: 'Saves',      icon: 'folder', app: 'Semble',           appId: 'semble', verb: 'saved' },
  'blog.pckt.document':                   { type: 'pckt',      label: 'pckt',       icon: 'file-text', app: 'pckt',             appId: 'pckt', verb: 'saved' },
  'community.lexicon.bookmarks.bookmark': { type: 'lex-bookmark', label: 'Bookmarks', icon: 'bookmark', app: 'Bookmarks', verb: 'bookmarked' },
};
// app.bsky.feed.post needs the path to disambiguate reply vs quote vs link-card
const KNOWN_WITH_PATH = {
  'app.bsky.feed.post|.reply.parent.uri':    { type: 'reply',     label: 'Replies',           icon: 'message-circle', app: 'Bluesky', appId: 'bluesky' , verb: 'replied to'},
  'app.bsky.feed.post|.embed.record.uri':    { type: 'quote',     label: 'Quotes',            icon: 'quote',  app: 'Bluesky', appId: 'bluesky', verb: 'quoted' },
  'app.bsky.feed.post|.embed.external.uri':  { type: 'bsky-link', label: 'Linked on Bluesky', icon: 'link', app: 'Bluesky', appId: 'bluesky', verb: 'linked to' },
  // Richtext link facets (a bare URL in the post body) point at the page too.
  // Constellation emits both an old and new index notation for the same field.
  'app.bsky.feed.post|.facets[].features[app.bsky.richtext.facet#link].uri':                          { type: 'bsky-link', label: 'Linked on Bluesky', icon: 'link', app: 'Bluesky', appId: 'bluesky' },
  'app.bsky.feed.post|.facets[app.bsky.richtext.facet].features[app.bsky.richtext.facet#link].uri':   { type: 'bsky-link', label: 'Linked on Bluesky', icon: 'link', app: 'Bluesky', appId: 'bluesky' },
  // Bridgy-mirrored fediverse post that links the page; lives in the bsky feed.
  'app.bsky.feed.post|.bridgyOriginalUrl':   { type: 'bsky-link', label: 'Linked on Bluesky', icon: 'link', app: 'Bluesky', appId: 'bluesky' },
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
  return { type: `${collection}${path}`, label: humanizeNsid(collection), icon: 'circle', app, verb: 'reacted to' };
}
