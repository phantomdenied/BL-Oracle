# Pre-redesign backup — 2026-08-21

Full snapshot of the live production build, taken immediately before
The Oracle's visual overhaul (menu/layout/design-system rework).

Git commit this backup was taken from: `b83ff4938dfd880b00a65b04b95e6a32cacb8c09`

## What's here

| File in this backup             | Live path                    | Notes |
|----------------------------------|-------------------------------|-------|
| `index-v2.html`                  | `/index-v2.html`              | **This is what's actually live at the site root** — `netlify.toml` rewrites `/` to it. This is the file the redesign is happening on. |
| `index.html`                     | `/index.html`                 | Deprecated v1, kept only as a fallback, reachable at `/index.html` directly. Not touched by the redesign. |
| `netlify.toml`                   | `/netlify.toml`                | Routing config, incl. the `/` → `/index-v2.html` rewrite. |
| `netlify/functions/gphoto.mjs`   | `/netlify/functions/gphoto.mjs` | Resolves Google Photos short URLs to direct image URLs. |
| `netlify/functions/decks.mjs`    | `/netlify/functions/decks.mjs`  | Imports deck lists from MTGGoldfish/Moxfield. |

Each file has a header comment noting it's a backup — don't edit these copies in place.

## How to roll back

**Option A — restore individual files from this folder** (works even outside git):

```
cp backup-2026-08-21/index-v2.html index-v2.html
cp backup-2026-08-21/index.html index.html
cp backup-2026-08-21/netlify.toml netlify.toml
cp backup-2026-08-21/netlify/functions/gphoto.mjs netlify/functions/gphoto.mjs
cp backup-2026-08-21/netlify/functions/decks.mjs netlify/functions/decks.mjs
```
(Then strip the "BACKUP —" header comment each restored file picked up, if you want the file byte-identical to the pre-redesign original.)

**Option B — restore from the git commit directly** (equivalent, no header comments to strip):

```
git checkout b83ff4938dfd880b00a65b04b95e6a32cacb8c09 -- index-v2.html index.html netlify.toml netlify/functions/gphoto.mjs netlify/functions/decks.mjs
```

**Option C — git tag**, for a named reference to this exact point in history:

```
git checkout pre-redesign-2026-08-21 -- index-v2.html
```

Any of these gets you back to exactly what was live before the redesign. Commit the restored files and push to deploy the rollback.
