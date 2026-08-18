# Posh Nosh

A tidy, offline-friendly recipe book for your own recipes. Search by name or ingredient, filter by category, scale servings up or down, save favorites, and import from a recipe link or add your own.

Works fully offline out of the box, with everything stored on your device. Optionally connect a free [Supabase](https://supabase.com) project to sign in and sync your recipes and favorites across every device you use.

**Live app:** https://g59dtjys8y-cmd.github.io/Posh-Nosh/ — installable as a PWA, "Add to Home Screen."

## Features

- **Browse** — every recipe you've added, across Breakfast, Mains, Sides, Desserts, Drinks, and Snacks, with search across titles, tags, and ingredients, plus category filter chips. Starts empty — add your first recipe from the + button or the Import from a URL feature below.
- **Recipe detail** — ingredients, step-by-step method, prep/cook time, difficulty, and notes, with a servings stepper that live-scales every ingredient quantity.
- **Favorites** — tap the heart on any recipe to save it to a dedicated Favorites tab.
- **My Recipes** — add, edit, or delete your own recipes from a simple form (title, category, tags, times, servings, ingredients, method, notes), with a "Delete All" option to clear every recipe you've added.
- **Import from a URL (optional)** — on the add-recipe form, paste a link to a recipe blog post and tap Fetch to pull in the title, ingredients, method, times, and servings automatically, for you to review before saving. Works on sites that embed structured recipe data (most SEO-focused recipe blogs do, for Google's rich search results) — not on social media, which doesn't expose recipe data this way. Requires a connected Supabase project (see below), since fetching another site's page has to happen server-side.
- **Account sync (optional)** — sign in with email/password to store your recipes and favorites in a Supabase Postgres database tied to your account, scoped by Row Level Security, and available on every device you sign into. If you have local recipes saved when you first sign in, you're offered a one-time import into your account. Without a configured Supabase project, the app runs entirely on local storage — no account needed.
- **Light / dark / auto theme** — a tap on the header icon cycles themes; respects your system preference by default.
- **Installable app (PWA)** — a web app manifest and service worker cache the app shell for fast, offline-capable loads.

## Tech stack

- Plain HTML, CSS, and JavaScript — no build step, no framework.
- [Supabase](https://supabase.com) for optional authentication and the Postgres database (`recipes` and `favorites` tables, scoped per-user with Row Level Security). Signed-out or unconfigured, recipe data and favorites are stored in the browser via `localStorage` instead.
- A web app manifest and service worker for PWA installability (app shell only).

## Project files

| File | Purpose |
|---|---|
| `index.html` | Page structure: browse/favorites/mine/account tabs, recipe detail overlay, add/edit form overlay |
| `style.css` | All styling, including the light/dark theme system |
| `script.js` | App logic: rendering, search/filter, favorites, servings scaling, add/edit/delete, URL import, Supabase auth + sync, local persistence |
| `manifest.json` | PWA metadata (name, icons, theme colors) |
| `sw.js` | Service worker for app-shell offline caching and installability |
| `icon.svg` / `icon-192.png` / `icon-512.png` | App icons |
| `supabase/functions/fetch-recipe/` | Edge Function that fetches a recipe URL server-side and extracts structured recipe data, for the URL-import feature |
| `supabase/config.toml` | Marks `fetch-recipe` as not requiring a signed-in user (it touches no user data) |

## Running locally

No build step needed — serve the folder with any static file server, e.g.:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Connecting your own Supabase project (optional)

By default `script.js` has placeholder Supabase credentials, so the app runs local-only and the Account tab explains sync isn't set up. To enable sign-in and cross-device sync:

1. Create a free project at [supabase.com](https://supabase.com).
2. In the SQL editor, run:
   ```sql
   create table recipes (
     id uuid primary key default gen_random_uuid(),
     user_id uuid references auth.users(id) default auth.uid(),
     title text not null,
     emoji text not null default '🍽️',
     category text not null,
     tags jsonb not null default '[]'::jsonb,
     prep integer not null default 0,
     cook integer not null default 0,
     servings integer not null default 1,
     difficulty text not null default 'Easy',
     ingredients jsonb not null default '[]'::jsonb,
     steps jsonb not null default '[]'::jsonb,
     notes text not null default '',
     created_at timestamptz not null default now()
   );

   alter table recipes enable row level security;

   create policy "Users manage own recipes" on recipes for all
     using (auth.uid() = user_id) with check (auth.uid() = user_id);

   create table favorites (
     id uuid primary key default gen_random_uuid(),
     user_id uuid references auth.users(id) default auth.uid(),
     recipe_id text not null,
     created_at timestamptz not null default now(),
     unique (user_id, recipe_id)
   );

   alter table favorites enable row level security;

   create policy "Users manage own favorites" on favorites for all
     using (auth.uid() = user_id) with check (auth.uid() = user_id);
   ```
3. In **Authentication → Providers**, confirm Email is enabled. Optionally turn off "Confirm email" for simpler local testing.
4. In `script.js`, replace `SUPABASE_URL` and `SUPABASE_KEY` (top of the file) with your own project's values, found under **Settings → API**.
5. Reload the app — the Account tab now offers sign-in/sign-up. Recipes and favorites saved locally before you connected Supabase are offered as a one-time import the first time you sign in.

## Enabling "Import from a URL" (optional, requires Supabase)

This needs one more piece: a Supabase Edge Function that fetches recipe pages server-side (a browser can't fetch another site's HTML directly — CORS blocks it). The function's code already lives in this repo at `supabase/functions/fetch-recipe/`; you just need to deploy it to your project:

1. Install the [Supabase CLI](https://supabase.com/docs/guides/cli) if you don't have it: `npm install -g supabase` (or see their docs for other install methods).
2. From the repo root, log in and link your project:
   ```sh
   supabase login
   supabase link --project-ref YOUR-PROJECT-REF
   ```
   Your project ref is the subdomain in your `SUPABASE_URL`, e.g. for `https://abcdefgh.supabase.co` it's `abcdefgh`.
3. Deploy the function:
   ```sh
   supabase functions deploy fetch-recipe
   ```
   `supabase/config.toml` already tells the CLI this function doesn't require a signed-in user's JWT (it doesn't touch your database — it only fetches and parses a public web page), so no extra flags are needed.
4. That's it — no further code changes. The app calls this function automatically once Supabase is connected (step 4 above); "Import from a URL" on the add-recipe form will start working the next time you reload.

**Coverage:** works well on established recipe blogs and sites using recipe plugins (they embed `schema.org/Recipe` structured data for Google's rich search results). Won't extract anything from social media, or from sites without that markup — you'll get a message saying so, and can fall back to typing the recipe in manually.
