# Posh Nosh — notes for future work

## Editing secrets / config constants

When setting `SUPABASE_URL`, `SUPABASE_KEY`, or any other string constant at the top of `script.js`, double-check the value is still a quoted string literal after editing — especially values containing `-` or `_`, which read as valid (but wrong) JavaScript if the quotes go missing, e.g. `sb_publishable_x-y` unquoted parses as `sb_publishable_x - y`, a subtraction of two undefined variables. That throws a `ReferenceError` at the very top of the file and silently breaks the *entire app*, not just the feature being configured — it's not a "some feature is broken" bug, it's a "nothing works" bug. After any such edit, sanity-check with `node --check script.js` at minimum, and ideally actually load the page and confirm no console errors before considering it done.

## Service worker / PWA caching

`sw.js` uses a network-first strategy (always try the network, fall back to the cache only when offline), not cache-first. This matters because browsers only detect a service worker update by diffing the *service worker file's own bytes* — if `sw.js` itself doesn't change, a cache-first strategy means users can get stuck on the first version of the app shell they ever loaded, forever, no matter how many fixes are shipped afterward. That's what happened here: a real bug got fixed and pushed, but stayed invisible to already-visited users because the SW kept serving its original cached `script.js`.

Consequences for future changes:
- Whenever `sw.js` itself is edited, bump `CACHE_NAME` (e.g. `posh-nosh-shell-v3`) so browsers detect the change and re-cache. This is *only* needed when `sw.js` changes — the network-first strategy means edits to `index.html`/`style.css`/`script.js` reach users on their next load without any cache-name bump.
- Don't cache requests carrying an `Authorization` header (Supabase auth/REST calls). Caching is keyed by URL, not by signed-in user, so on a shared device a cached response could otherwise leak one user's data to the next person who opens the app.
- After deploying an `sw.js` change, expect a one-time lag: a visitor's *first* reload lets the browser discover and install the new worker, and only the *second* reload (or a fresh tab) is actually served by it, because the page already in memory keeps running under whichever worker was in control when it loaded.

## General

This app intentionally mirrors patterns from the sibling repo `g59dtjys8y-cmd/schengen-guard-anywhere` (same author, same Supabase-backed sync approach, same service worker strategy) — when in doubt about how something here should work, that repo is worth checking for precedent.
