# Posh Nosh

A tidy, offline-friendly recipe book. Browse a starter collection of recipes, search by name or ingredient, filter by category, scale servings up or down, save favorites, and add your own recipes — all client-side, no account or server required.

**Live app:** installable as a PWA — open `index.html` on GitHub Pages (or any static host) and "Add to Home Screen."

## Features

- **Browse** — a seeded collection across Breakfast, Mains, Sides, Desserts, Drinks, and Snacks, with search across titles, tags, and ingredients, plus category filter chips.
- **Recipe detail** — ingredients, step-by-step method, prep/cook time, difficulty, and notes, with a servings stepper that live-scales every ingredient quantity.
- **Favorites** — tap the heart on any recipe (seeded or your own) to save it to a dedicated Favorites tab.
- **My Recipes** — add, edit, or delete your own recipes from a simple form (title, category, tags, times, servings, ingredients, method, notes). Stored locally in your browser.
- **Light / dark / auto theme** — a tap on the header icon cycles themes; respects your system preference by default.
- **Installable app (PWA)** — a web app manifest and service worker cache the app shell for fast, offline-capable loads. Your saved recipes and favorites live in `localStorage`, so they persist across sessions on the same device.

## Tech stack

Plain HTML, CSS, and JavaScript — no build step, no framework, no backend. Recipe data (seeded + your own) and favorites are stored in the browser via `localStorage`.

## Project files

| File | Purpose |
|---|---|
| `index.html` | Page structure: browse/favorites/mine tabs, recipe detail overlay, add/edit form overlay |
| `style.css` | All styling, including the light/dark theme system |
| `script.js` | App logic: seed recipe data, rendering, search/filter, favorites, servings scaling, add/edit/delete, persistence |
| `manifest.json` | PWA metadata (name, icons, theme colors) |
| `sw.js` | Service worker for app-shell offline caching and installability |
| `icon.svg` / `icon-192.png` / `icon-512.png` | App icons |

## Running locally

No build step needed — serve the folder with any static file server, e.g.:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`.
