# ATmentions

> Webmentions for the ATmosphere. Show how the open atproto network reacted to any page — likes, reposts, recommends, reads, Frontpage, Margin, Semble, and anything future — with zero accounts and zero lock-in. The network owns the reactions.

## Drop-in (one line)

```html
<script type="module" src="https://cdn.jsdelivr.net/npm/atmentions/dist/atmentions.min.js"></script>
<atmentions-reactions data-url="https://example.com/post" data-aturi="at://…/site.standard.document/…"></atmentions-reactions>
```

## Variants & theming

`variant="default"` (chip strip) or `variant="minimal"` (one count → expand). `appearance="light|dark|auto"`. Theme with `--atmo-fg`, `--atmo-accent`, etc.

## Headless

```js
import { fetchReactions } from 'atmentions';
const r = await fetchReactions({ url, aturi });
```

## How it works

Reads the open atproto backlink graph via a configurable index (default: Constellation / microcosm.blue). Bluesky counts come from the AppView; cross-app reactions from the backlink index. Read-only — ATmentions never writes records. MIT.
