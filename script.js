'use strict';

/* ---------------------------------------------------------------------- *
 * Supabase — optional cloud sync
 * Replace these with your own project's values (Settings → API) to enable
 * sign-in and cross-device sync. Left as placeholders, the app runs fully
 * offline on local storage. See README.md for setup steps.
 * ---------------------------------------------------------------------- */

const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
const SUPABASE_KEY = sb_publishable_dxhK5fsYXDNuFSVXJo1Sug_sX-NeXyf;
const SUPABASE_CONFIGURED = !SUPABASE_URL.includes('YOUR-PROJECT') && !SUPABASE_KEY.includes(sb_publishable_dxhK5fsYXDNuFSVXJo1Sug_sX-NeXyf);
const db = SUPABASE_CONFIGURED && window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

/* ---------------------------------------------------------------------- *
 * Constants & storage helpers
 * ---------------------------------------------------------------------- */

const CATEGORIES = ['Breakfast', 'Mains', 'Sides', 'Desserts', 'Drinks', 'Snacks'];

const STORAGE_KEYS = {
  custom: 'poshnosh.customRecipes',
  favorites: 'poshnosh.favorites',
  theme: 'poshnosh.theme',
};

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (err) {
    return fallback;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/* ---------------------------------------------------------------------- *
 * Seed recipes
 * Ingredient quantities are numeric (supports fractions) so servings can
 * be scaled; `unit` and `name` are kept separate for clean formatting.
 * ---------------------------------------------------------------------- */

function ing(qty, unit, name) {
  return { qty, unit, name };
}

const SEED_RECIPES = [
  {
    id: 'seed-shakshuka',
    title: 'Shakshuka',
    emoji: '🍳',
    category: 'Breakfast',
    tags: ['vegetarian', 'one-pan'],
    prep: 10, cook: 25, servings: 4, difficulty: 'Easy',
    ingredients: [
      ing(2, 'tbsp', 'olive oil'),
      ing(1, '', 'onion, sliced'),
      ing(1, '', 'red bell pepper, sliced'),
      ing(3, 'cloves', 'garlic, minced'),
      ing(1, 'tsp', 'cumin'),
      ing(1, 'tsp', 'smoked paprika'),
      ing(1, 'can (400g)', 'crushed tomatoes'),
      ing(6, '', 'eggs'),
      ing(0, '', 'salt & pepper, to taste'),
      ing(0.25, 'cup', 'fresh parsley, chopped'),
    ],
    steps: [
      'Heat olive oil in a large skillet over medium heat. Add onion and pepper, cook until soft, about 6 minutes.',
      'Stir in garlic, cumin, and paprika; cook for 1 minute until fragrant.',
      'Add crushed tomatoes, season with salt and pepper, and simmer for 10 minutes until thickened.',
      'Make 6 small wells in the sauce and crack an egg into each.',
      'Cover and cook for 6–8 minutes until egg whites are set but yolks are still runny.',
      'Scatter parsley over the top and serve straight from the pan with warm bread.',
    ],
    notes: 'Swap in feta for a creamier finish, or add a pinch of chili flakes for heat.',
  },
  {
    id: 'seed-pancakes',
    title: 'Fluffy Buttermilk Pancakes',
    emoji: '🥞',
    category: 'Breakfast',
    tags: ['vegetarian', 'weekend'],
    prep: 10, cook: 15, servings: 4, difficulty: 'Easy',
    ingredients: [
      ing(2, 'cups', 'flour'),
      ing(2, 'tbsp', 'sugar'),
      ing(2, 'tsp', 'baking powder'),
      ing(0.5, 'tsp', 'baking soda'),
      ing(0.5, 'tsp', 'salt'),
      ing(2, 'cups', 'buttermilk'),
      ing(2, '', 'eggs'),
      ing(4, 'tbsp', 'butter, melted'),
    ],
    steps: [
      'Whisk together flour, sugar, baking powder, baking soda, and salt in a large bowl.',
      'In another bowl, whisk buttermilk, eggs, and melted butter.',
      'Pour wet ingredients into dry and stir until just combined — a few lumps are fine.',
      'Heat a lightly greased griddle over medium heat. Pour 1/4 cup batter per pancake.',
      'Cook until bubbles form on the surface, about 2–3 minutes, then flip and cook 1–2 minutes more.',
      'Serve warm with maple syrup and butter.',
    ],
    notes: 'Let the batter rest 5 minutes before cooking for extra-fluffy pancakes.',
  },
  {
    id: 'seed-roast-chicken',
    title: 'Sunday Roast Chicken',
    emoji: '🍗',
    category: 'Mains',
    tags: ['sunday-dinner', 'gluten-free'],
    prep: 15, cook: 80, servings: 4, difficulty: 'Medium',
    ingredients: [
      ing(1, '(1.8kg)', 'whole chicken'),
      ing(1, '', 'lemon, halved'),
      ing(4, 'cloves', 'garlic'),
      ing(1, 'bunch', 'fresh thyme'),
      ing(3, 'tbsp', 'butter, softened'),
      ing(2, 'tbsp', 'olive oil'),
      ing(0, '', 'salt & pepper, to taste'),
      ing(4, '', 'carrots, halved'),
      ing(4, '', 'potatoes, quartered'),
    ],
    steps: [
      'Preheat oven to 220°C (425°F). Pat the chicken dry with paper towels.',
      'Stuff the cavity with lemon, garlic, and thyme.',
      'Rub the skin with softened butter and olive oil; season generously with salt and pepper.',
      'Arrange carrots and potatoes around the chicken in a roasting tin.',
      'Roast for 20 minutes, then reduce heat to 180°C (350°F) and roast 55–60 minutes more, until juices run clear.',
      'Rest the chicken for 10 minutes before carving.',
    ],
    notes: 'Baste with pan juices halfway through for extra-crisp, golden skin.',
  },
  {
    id: 'seed-carbonara',
    title: 'Spaghetti Carbonara',
    emoji: '🍝',
    category: 'Mains',
    tags: ['quick', 'weeknight'],
    prep: 10, cook: 15, servings: 4, difficulty: 'Medium',
    ingredients: [
      ing(400, 'g', 'spaghetti'),
      ing(200, 'g', 'pancetta or guanciale, diced'),
      ing(4, '', 'egg yolks'),
      ing(1, '', 'whole egg'),
      ing(1, 'cup', 'Pecorino Romano, grated'),
      ing(1, 'tsp', 'black pepper, freshly cracked'),
      ing(0, '', 'salt, to taste'),
    ],
    steps: [
      'Bring a large pot of salted water to a boil and cook spaghetti until al dente.',
      'Meanwhile, fry pancetta in a dry pan over medium heat until crisp.',
      'Whisk egg yolks, whole egg, Pecorino, and black pepper together in a bowl.',
      'Reserve 1 cup pasta water, then drain the pasta and add it to the pancetta pan off the heat.',
      'Quickly pour in the egg mixture, tossing constantly, adding splashes of pasta water until glossy and creamy.',
      'Serve immediately with extra Pecorino and black pepper.',
    ],
    notes: 'Keep the pan off direct heat when adding the eggs so they don\'t scramble.',
  },
  {
    id: 'seed-buddha-bowl',
    title: 'Rainbow Buddha Bowl',
    emoji: '🥗',
    category: 'Mains',
    tags: ['vegan', 'healthy', 'gluten-free'],
    prep: 20, cook: 20, servings: 2, difficulty: 'Easy',
    ingredients: [
      ing(1, 'cup', 'quinoa, rinsed'),
      ing(1, '', 'sweet potato, cubed'),
      ing(1, 'can', 'chickpeas, drained and rinsed'),
      ing(2, 'tbsp', 'olive oil'),
      ing(1, 'tsp', 'cumin'),
      ing(2, 'cups', 'baby spinach'),
      ing(1, '', 'avocado, sliced'),
      ing(0.25, 'cup', 'tahini'),
      ing(1, '', 'lemon, juiced'),
    ],
    steps: [
      'Preheat oven to 200°C (400°F). Cook quinoa according to package instructions.',
      'Toss sweet potato and chickpeas with olive oil and cumin; roast for 20 minutes until golden.',
      'Whisk tahini with lemon juice and a splash of water to make a pourable dressing.',
      'Divide quinoa and spinach between bowls.',
      'Top with roasted sweet potato, chickpeas, and avocado.',
      'Drizzle with tahini dressing and serve.',
    ],
    notes: 'Great for meal prep — store components separately and assemble fresh.',
  },
  {
    id: 'seed-garlic-bread',
    title: 'Garlic Bread',
    emoji: '🥖',
    category: 'Sides',
    tags: ['vegetarian', 'quick', 'crowd-pleaser'],
    prep: 10, cook: 12, servings: 6, difficulty: 'Easy',
    ingredients: [
      ing(1, '', 'baguette, halved lengthwise'),
      ing(0.5, 'cup', 'butter, softened'),
      ing(4, 'cloves', 'garlic, minced'),
      ing(2, 'tbsp', 'fresh parsley, chopped'),
      ing(0.25, 'cup', 'Parmesan, grated'),
      ing(0, '', 'salt, to taste'),
    ],
    steps: [
      'Preheat oven to 200°C (400°F).',
      'Mix butter, garlic, parsley, and a pinch of salt in a bowl.',
      'Spread the mixture evenly over the cut sides of the baguette.',
      'Sprinkle with Parmesan.',
      'Bake for 10–12 minutes until golden and crisp at the edges.',
      'Slice and serve warm.',
    ],
    notes: '',
  },
  {
    id: 'seed-caesar-salad',
    title: 'Classic Caesar Salad',
    emoji: '🥬',
    category: 'Sides',
    tags: ['vegetarian option', 'quick'],
    prep: 15, cook: 5, servings: 4, difficulty: 'Easy',
    ingredients: [
      ing(2, 'heads', 'romaine lettuce, chopped'),
      ing(1, 'cup', 'croutons'),
      ing(0.5, 'cup', 'Parmesan, shaved'),
      ing(0.5, 'cup', 'mayonnaise'),
      ing(2, 'tbsp', 'lemon juice'),
      ing(1, 'tsp', 'Dijon mustard'),
      ing(2, '', 'anchovy fillets, minced'),
      ing(1, 'clove', 'garlic, minced'),
    ],
    steps: [
      'Whisk mayonnaise, lemon juice, Dijon, anchovy, and garlic together to make the dressing.',
      'Toss romaine with enough dressing to coat generously.',
      'Add croutons and half the Parmesan, toss again.',
      'Plate and top with remaining Parmesan.',
      'Serve immediately.',
    ],
    notes: 'Leave out the anchovy and use a vegetarian Worcestershire for a meat-free version.',
  },
  {
    id: 'seed-tomato-soup',
    title: 'Creamy Tomato Soup',
    emoji: '🍅',
    category: 'Sides',
    tags: ['vegetarian', 'comfort-food', 'freezer-friendly'],
    prep: 10, cook: 30, servings: 4, difficulty: 'Easy',
    ingredients: [
      ing(2, 'tbsp', 'butter'),
      ing(1, '', 'onion, chopped'),
      ing(2, 'cloves', 'garlic, minced'),
      ing(2, 'cans (400g)', 'whole peeled tomatoes'),
      ing(2, 'cups', 'vegetable stock'),
      ing(0.5, 'cup', 'heavy cream'),
      ing(1, 'tsp', 'sugar'),
      ing(0, '', 'salt & pepper, to taste'),
    ],
    steps: [
      'Melt butter in a pot over medium heat. Cook onion until soft, about 5 minutes.',
      'Add garlic and cook 1 minute more.',
      'Stir in tomatoes and stock, breaking up the tomatoes with a spoon.',
      'Simmer uncovered for 20 minutes.',
      'Blend until smooth using an immersion blender.',
      'Stir in cream and sugar, season to taste, and serve hot with crusty bread.',
    ],
    notes: 'Freezes well for up to 3 months — leave out the cream and add fresh when reheating.',
  },
  {
    id: 'seed-brownies',
    title: 'Fudgy Chocolate Brownies',
    emoji: '🍫',
    category: 'Desserts',
    tags: ['vegetarian', 'chocolate'],
    prep: 15, cook: 30, servings: 9, difficulty: 'Easy',
    ingredients: [
      ing(0.75, 'cup', 'butter, melted'),
      ing(1.25, 'cups', 'sugar'),
      ing(3, '', 'eggs'),
      ing(1, 'tsp', 'vanilla extract'),
      ing(0.75, 'cup', 'cocoa powder'),
      ing(0.5, 'cup', 'flour'),
      ing(0.25, 'tsp', 'salt'),
      ing(0.5, 'cup', 'chocolate chips'),
    ],
    steps: [
      'Preheat oven to 175°C (350°F) and line a 9x9-inch pan with parchment.',
      'Whisk melted butter and sugar together until glossy.',
      'Beat in eggs one at a time, then stir in vanilla.',
      'Fold in cocoa powder, flour, and salt until just combined — don\'t overmix.',
      'Fold in chocolate chips and pour batter into the pan.',
      'Bake for 28–32 minutes, until a toothpick comes out with a few moist crumbs. Cool before slicing.',
    ],
    notes: 'For extra-fudgy brownies, pull them out a couple minutes early.',
  },
  {
    id: 'seed-tiramisu',
    title: 'Classic Tiramisu',
    emoji: '🍰',
    category: 'Desserts',
    tags: ['make-ahead', 'coffee'],
    prep: 30, cook: 0, servings: 8, difficulty: 'Medium',
    ingredients: [
      ing(6, '', 'egg yolks'),
      ing(0.75, 'cup', 'sugar'),
      ing(2, 'cups', 'mascarpone'),
      ing(1.5, 'cups', 'espresso, cooled'),
      ing(2, 'tbsp', 'coffee liqueur (optional)'),
      ing(24, '', 'ladyfinger biscuits'),
      ing(2, 'tbsp', 'cocoa powder, for dusting'),
    ],
    steps: [
      'Whisk egg yolks and sugar over a double boiler until pale and thickened, about 5 minutes.',
      'Remove from heat and fold in mascarpone until smooth.',
      'Combine espresso and coffee liqueur in a shallow dish.',
      'Quickly dip each ladyfinger in the espresso mixture and layer half in a dish.',
      'Spread half the mascarpone mixture over the ladyfingers. Repeat with a second layer.',
      'Dust generously with cocoa powder and refrigerate at least 4 hours, ideally overnight.',
    ],
    notes: 'Uses raw egg yolks — use pasteurized eggs if serving to anyone at higher risk.',
  },
  {
    id: 'seed-lemonade',
    title: 'Fresh Mint Lemonade',
    emoji: '🍋',
    category: 'Drinks',
    tags: ['vegan', 'refreshing', 'no-cook'],
    prep: 10, cook: 0, servings: 6, difficulty: 'Easy',
    ingredients: [
      ing(1, 'cup', 'fresh lemon juice (about 6 lemons)'),
      ing(0.75, 'cup', 'sugar'),
      ing(4, 'cups', 'cold water'),
      ing(0.5, 'cup', 'fresh mint leaves'),
      ing(1, '', 'lemon, sliced, for serving'),
      ing(0, '', 'ice, to serve'),
    ],
    steps: [
      'Dissolve sugar in 1 cup of warm water to make a simple syrup; let cool.',
      'Muddle mint leaves gently in a large pitcher.',
      'Add lemon juice, simple syrup, and cold water; stir well.',
      'Add lemon slices and refrigerate for at least 30 minutes.',
      'Serve over ice with extra mint to garnish.',
    ],
    notes: 'Adjust sugar to taste depending on how tart your lemons are.',
  },
  {
    id: 'seed-guacamole',
    title: 'Chunky Guacamole',
    emoji: '🥑',
    category: 'Snacks',
    tags: ['vegan', 'no-cook', 'quick'],
    prep: 10, cook: 0, servings: 4, difficulty: 'Easy',
    ingredients: [
      ing(3, '', 'ripe avocados'),
      ing(0.5, '', 'red onion, finely diced'),
      ing(1, '', 'tomato, diced'),
      ing(1, '', 'jalapeño, minced'),
      ing(2, 'tbsp', 'fresh cilantro, chopped'),
      ing(2, 'tbsp', 'lime juice'),
      ing(0.5, 'tsp', 'salt'),
    ],
    steps: [
      'Halve and pit the avocados; scoop the flesh into a bowl.',
      'Mash to your preferred texture — chunky or smooth.',
      'Fold in onion, tomato, jalapeño, and cilantro.',
      'Stir in lime juice and salt.',
      'Taste and adjust seasoning, then serve with tortilla chips.',
    ],
    notes: 'Keep an avocado pit in the bowl and press plastic wrap directly on the surface to slow browning.',
  },
  {
    id: 'seed-hummus',
    title: 'Silky Hummus',
    emoji: '🫘',
    category: 'Snacks',
    tags: ['vegan', 'no-cook', 'gluten-free'],
    prep: 10, cook: 0, servings: 6, difficulty: 'Easy',
    ingredients: [
      ing(2, 'cans', 'chickpeas, drained (liquid reserved)'),
      ing(0.33, 'cup', 'tahini'),
      ing(3, 'tbsp', 'lemon juice'),
      ing(2, 'cloves', 'garlic'),
      ing(2, 'tbsp', 'olive oil, plus more for serving'),
      ing(0.5, 'tsp', 'cumin'),
      ing(0.5, 'tsp', 'salt'),
    ],
    steps: [
      'Combine chickpeas, tahini, lemon juice, garlic, olive oil, cumin, and salt in a food processor.',
      'Blend until mostly smooth, scraping down the sides as needed.',
      'Add reserved chickpea liquid a tablespoon at a time until silky and light.',
      'Taste and adjust lemon or salt as needed.',
      'Spoon into a bowl, drizzle with olive oil, and serve with pita or vegetables.',
    ],
    notes: 'For the smoothest hummus, blend for a full 3–4 minutes — longer than feels necessary.',
  },
  {
    id: 'seed-banana-bread',
    title: 'Banana Bread',
    emoji: '🍌',
    category: 'Breakfast',
    tags: ['vegetarian', 'use-up-leftovers'],
    prep: 10, cook: 55, servings: 8, difficulty: 'Easy',
    ingredients: [
      ing(3, '', 'ripe bananas, mashed'),
      ing(0.33, 'cup', 'butter, melted'),
      ing(0.75, 'cup', 'sugar'),
      ing(1, '', 'egg'),
      ing(1, 'tsp', 'vanilla extract'),
      ing(1, 'tsp', 'baking soda'),
      ing(0.25, 'tsp', 'salt'),
      ing(1.5, 'cups', 'flour'),
    ],
    steps: [
      'Preheat oven to 175°C (350°F) and grease a loaf pan.',
      'Mix mashed bananas with melted butter.',
      'Stir in sugar, egg, and vanilla.',
      'Sprinkle baking soda and salt over the mixture and stir in.',
      'Fold in flour until just combined, then pour into the loaf pan.',
      'Bake for 55–60 minutes, until a toothpick comes out clean. Cool before slicing.',
    ],
    notes: 'The more speckled and overripe the bananas, the better the flavor.',
  },
];

/* ---------------------------------------------------------------------- *
 * State
 * ---------------------------------------------------------------------- */

const state = {
  customRecipes: loadJSON(STORAGE_KEYS.custom, []),
  favorites: new Set(loadJSON(STORAGE_KEYS.favorites, [])),
  activeView: 'browse',
  activeCategory: 'All',
  searchTerm: '',
  activeRecipeId: null,
  activeServings: null,
  editingRecipeId: null,
  session: null,
};

function allRecipes() {
  return [...SEED_RECIPES, ...state.customRecipes];
}

function findRecipe(id) {
  return allRecipes().find((r) => r.id === id);
}

function isCustom(id) {
  return !SEED_RECIPES.some((r) => r.id === id);
}

function persistFavorites() {
  saveJSON(STORAGE_KEYS.favorites, [...state.favorites]);
}

function persistCustom() {
  saveJSON(STORAGE_KEYS.custom, state.customRecipes);
}

/* ---------------------------------------------------------------------- *
 * Formatting helpers
 * ---------------------------------------------------------------------- */

function formatQty(qty) {
  if (!qty) return '';
  const whole = Math.floor(qty);
  const frac = qty - whole;
  const fractions = { 0.25: '¼', 0.33: '⅓', 0.5: '½', 0.66: '⅔', 0.67: '⅔', 0.75: '¾' };
  let fracStr = '';
  if (frac > 0.001) {
    const nearest = Object.keys(fractions).reduce((a, b) =>
      Math.abs(frac - a) < Math.abs(frac - b) ? a : b, Object.keys(fractions)[0]);
    if (Math.abs(frac - nearest) < 0.05) {
      fracStr = fractions[nearest];
    } else {
      return String(Math.round(qty * 100) / 100);
    }
  }
  if (whole === 0) return fracStr;
  return fracStr ? `${whole}${fracStr}` : String(whole);
}

function scaledIngredientLine(ingredient, scale) {
  const scaledQty = ingredient.qty * scale;
  const qtyStr = formatQty(scaledQty);
  return { qtyStr, unit: ingredient.unit, name: ingredient.name };
}

function timeLabel(mins) {
  if (!mins && mins !== 0) return '–';
  if (mins === 0) return '–';
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function totalTime(recipe) {
  return (recipe.prep || 0) + (recipe.cook || 0);
}

/* ---------------------------------------------------------------------- *
 * DOM refs
 * ---------------------------------------------------------------------- */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const els = {
  searchInput: $('#searchInput'),
  categoryChips: $('#categoryChips'),
  browseGrid: $('#browseGrid'),
  browseEmpty: $('#browseEmpty'),
  favoritesGrid: $('#favoritesGrid'),
  favoritesEmpty: $('#favoritesEmpty'),
  mineGrid: $('#mineGrid'),
  mineEmpty: $('#mineEmpty'),
  tabBtns: $$('.tab-btn'),
  views: $$('.view'),
  addRecipeFab: $('#addRecipeFab'),
  themeToggle: $('#themeToggle'),

  detailOverlay: $('#detailOverlay'),
  detailClose: $('#detailClose'),
  detailFavToggle: $('#detailFavToggle'),
  detailEdit: $('#detailEdit'),
  detailDelete: $('#detailDelete'),
  detailEmoji: $('#detailEmoji'),
  detailTitle: $('#detailTitle'),
  detailCategory: $('#detailCategory'),
  detailTags: $('#detailTags'),
  detailPrep: $('#detailPrep'),
  detailCook: $('#detailCook'),
  detailDifficulty: $('#detailDifficulty'),
  servingsMinus: $('#servingsMinus'),
  servingsPlus: $('#servingsPlus'),
  servingsValue: $('#servingsValue'),
  detailIngredients: $('#detailIngredients'),
  detailSteps: $('#detailSteps'),
  detailNotesSection: $('#detailNotesSection'),
  detailNotes: $('#detailNotes'),

  formOverlay: $('#formOverlay'),
  formClose: $('#formClose'),
  formSave: $('#formSave'),
  formTitle: $('#formTitle'),
  recipeForm: $('#recipeForm'),
  fTitle: $('#fTitle'),
  fEmoji: $('#fEmoji'),
  fCategory: $('#fCategory'),
  fTags: $('#fTags'),
  fPrep: $('#fPrep'),
  fCook: $('#fCook'),
  fServings: $('#fServings'),
  fDifficulty: $('#fDifficulty'),
  fIngredients: $('#fIngredients'),
  fSteps: $('#fSteps'),
  fNotes: $('#fNotes'),

  toast: $('#toast'),

  accountUnconfigured: $('#accountUnconfigured'),
  accountSignedOut: $('#accountSignedOut'),
  accountSignedIn: $('#accountSignedIn'),
  accountEmail: $('#accountEmail'),
  accountTabLabel: $('#accountTabLabel'),
  authForm: $('#authForm'),
  authEmail: $('#authEmail'),
  authPassword: $('#authPassword'),
  authSignIn: $('#authSignIn'),
  authSignUp: $('#authSignUp'),
  authSignOut: $('#authSignOut'),
  authStatus: $('#authStatus'),
};

/* ---------------------------------------------------------------------- *
 * Rendering
 * ---------------------------------------------------------------------- */

function renderCategoryChips() {
  const chips = ['All', ...CATEGORIES];
  els.categoryChips.innerHTML = '';
  chips.forEach((cat) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip' + (state.activeCategory === cat ? ' is-active' : '');
    btn.textContent = cat;
    btn.addEventListener('click', () => {
      state.activeCategory = cat;
      renderCategoryChips();
      renderBrowse();
    });
    els.categoryChips.appendChild(btn);
  });
}

function matchesSearch(recipe, term) {
  if (!term) return true;
  const haystack = [
    recipe.title,
    recipe.category,
    ...(recipe.tags || []),
    ...recipe.ingredients.map((i) => i.name),
  ].join(' ').toLowerCase();
  return haystack.includes(term);
}

function cardHTML(recipe) {
  const fav = state.favorites.has(recipe.id);
  return `
    <div class="card-media">${recipe.emoji || '🍽️'}</div>
    <div class="card-body">
      <div class="card-title">${escapeHTML(recipe.title)}</div>
      <div class="card-meta">${timeLabel(totalTime(recipe))} · ${recipe.category}</div>
    </div>
    <button class="card-fav${fav ? ' is-fav' : ''}" type="button" aria-label="Toggle favorite" data-fav-id="${recipe.id}">
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 21s-6.7-4.35-9.3-8.2C1 10.1 1.6 6.6 4.6 5.1c2.2-1.1 4.6-.3 5.9 1.6l1.5 2 1.5-2c1.3-1.9 3.7-2.7 5.9-1.6 3 1.5 3.6 5 1.9 7.7C18.7 16.65 12 21 12 21z" fill="${fav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"/></svg>
    </button>
  `;
}

function buildCard(recipe) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = 'recipe-card';
  card.dataset.id = recipe.id;
  card.innerHTML = cardHTML(recipe);
  card.addEventListener('click', (e) => {
    if (e.target.closest('[data-fav-id]')) return;
    openDetail(recipe.id);
  });
  card.querySelector('[data-fav-id]').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleFavorite(recipe.id);
  });
  return card;
}

function renderBrowse() {
  const term = state.searchTerm.trim().toLowerCase();
  const list = allRecipes().filter((r) => {
    const catMatch = state.activeCategory === 'All' || r.category === state.activeCategory;
    return catMatch && matchesSearch(r, term);
  });
  els.browseGrid.innerHTML = '';
  list.forEach((r) => els.browseGrid.appendChild(buildCard(r)));
  els.browseEmpty.hidden = list.length > 0;
}

function renderFavorites() {
  const list = allRecipes().filter((r) => state.favorites.has(r.id));
  els.favoritesGrid.innerHTML = '';
  list.forEach((r) => els.favoritesGrid.appendChild(buildCard(r)));
  els.favoritesEmpty.hidden = list.length > 0;
}

function renderMine() {
  els.mineGrid.innerHTML = '';
  state.customRecipes.forEach((r) => els.mineGrid.appendChild(buildCard(r)));
  els.mineEmpty.hidden = state.customRecipes.length > 0;
}

function renderAll() {
  renderBrowse();
  renderFavorites();
  renderMine();
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

/* ---------------------------------------------------------------------- *
 * Favorites
 * ---------------------------------------------------------------------- */

async function toggleFavorite(id) {
  const wasFav = state.favorites.has(id);

  if (state.session) {
    try {
      if (wasFav) {
        const { error } = await db.from('favorites').delete()
          .eq('user_id', state.session.user.id).eq('recipe_id', id);
        if (error) throw error;
      } else {
        const { error } = await db.from('favorites')
          .insert({ user_id: state.session.user.id, recipe_id: id });
        if (error) throw error;
      }
    } catch (err) {
      showToast('Sync error — try again');
      return;
    }
  }

  if (wasFav) state.favorites.delete(id); else state.favorites.add(id);
  if (!state.session) persistFavorites();
  renderAll();
  if (state.activeRecipeId === id) updateDetailFavIcon(id);
}

function updateDetailFavIcon(id) {
  const isFav = state.favorites.has(id);
  els.detailFavToggle.classList.toggle('is-fav', isFav);
  const path = els.detailFavToggle.querySelector('path');
  path.setAttribute('fill', isFav ? 'currentColor' : 'none');
  path.setAttribute('stroke', 'currentColor');
  path.setAttribute('stroke-width', '2');
  els.detailFavToggle.style.color = isFav ? 'var(--accent)' : '';
}

/* ---------------------------------------------------------------------- *
 * Views / tabs
 * ---------------------------------------------------------------------- */

function switchView(view) {
  state.activeView = view;
  els.views.forEach((v) => { v.hidden = v.dataset.view !== view; });
  els.tabBtns.forEach((b) => b.classList.toggle('is-active', b.dataset.view === view));
}

/* ---------------------------------------------------------------------- *
 * Detail overlay
 * ---------------------------------------------------------------------- */

function openDetail(id) {
  const recipe = findRecipe(id);
  if (!recipe) return;
  state.activeRecipeId = id;
  state.activeServings = recipe.servings;

  els.detailEmoji.textContent = recipe.emoji || '🍽️';
  els.detailTitle.textContent = recipe.title;
  els.detailCategory.textContent = recipe.category;
  els.detailTags.innerHTML = (recipe.tags || [])
    .map((t) => `<span class="tag">${escapeHTML(t)}</span>`).join('');
  els.detailPrep.textContent = timeLabel(recipe.prep);
  els.detailCook.textContent = timeLabel(recipe.cook);
  els.detailDifficulty.textContent = recipe.difficulty || '–';
  els.detailNotesSection.hidden = !recipe.notes;
  els.detailNotes.textContent = recipe.notes || '';

  els.detailSteps.innerHTML = recipe.steps
    .map((s) => `<li>${escapeHTML(s)}</li>`).join('');

  const custom = isCustom(id);
  els.detailEdit.hidden = !custom;
  els.detailDelete.hidden = !custom;

  updateDetailFavIcon(id);
  renderServings();
  els.detailOverlay.hidden = false;
  document.body.style.overflow = 'hidden';
  els.detailOverlay.scrollTop = 0;
}

function closeDetail() {
  els.detailOverlay.hidden = true;
  document.body.style.overflow = '';
  state.activeRecipeId = null;
}

function renderServings() {
  const recipe = findRecipe(state.activeRecipeId);
  if (!recipe) return;
  els.servingsValue.textContent = state.activeServings;
  const scale = state.activeServings / recipe.servings;
  els.detailIngredients.innerHTML = recipe.ingredients.map((ingredient) => {
    const { qtyStr, unit, name } = scaledIngredientLine(ingredient, scale);
    const qtyDisplay = [qtyStr, unit].filter(Boolean).join(' ');
    return `<li><span class="ingredient-qty">${escapeHTML(qtyDisplay)}</span><span>${escapeHTML(name)}</span></li>`;
  }).join('');
}

function changeServings(delta) {
  const next = state.activeServings + delta;
  if (next < 1) return;
  state.activeServings = next;
  renderServings();
}

/* ---------------------------------------------------------------------- *
 * Add / edit form
 * ---------------------------------------------------------------------- */

function populateCategorySelect() {
  els.fCategory.innerHTML = CATEGORIES
    .map((c) => `<option value="${c}">${c}</option>`).join('');
}

function openForm(editId) {
  state.editingRecipeId = editId || null;
  els.recipeForm.reset();

  if (editId) {
    const recipe = findRecipe(editId);
    els.formTitle.textContent = 'Edit recipe';
    els.fTitle.value = recipe.title;
    els.fEmoji.value = recipe.emoji || '';
    els.fCategory.value = recipe.category;
    els.fTags.value = (recipe.tags || []).join(', ');
    els.fPrep.value = recipe.prep || '';
    els.fCook.value = recipe.cook || '';
    els.fServings.value = recipe.servings || 4;
    els.fDifficulty.value = recipe.difficulty || 'Easy';
    els.fIngredients.value = recipe.ingredients
      .map((i) => [i.qty || '', i.unit, i.name].filter(Boolean).join(' ')).join('\n');
    els.fSteps.value = recipe.steps.join('\n');
    els.fNotes.value = recipe.notes || '';
  } else {
    els.formTitle.textContent = 'New recipe';
    els.fServings.value = 4;
    els.fDifficulty.value = 'Easy';
  }

  els.formOverlay.hidden = false;
  document.body.style.overflow = 'hidden';
  els.formOverlay.scrollTop = 0;
  els.fTitle.focus();
}

function closeForm() {
  els.formOverlay.hidden = true;
  document.body.style.overflow = '';
  state.editingRecipeId = null;
}

/** Parses a free-text ingredient line like "2 cups flour" or "3 eggs" into {qty, unit, name}. */
function parseIngredientLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^([\d.\/\s]+)?\s*(cups?|tbsp|tsp|g|kg|ml|l|oz|lb|cloves?|cans?(?:\s*\([^)]*\))?|bunch(?:es)?|heads?|slices?)?\s*(.*)$/i);
  if (!match) return { qty: 0, unit: '', name: trimmed };

  let [, qtyRaw, unit, name] = match;
  let qty = 0;
  if (qtyRaw) {
    qtyRaw = qtyRaw.trim();
    if (qtyRaw.includes('/')) {
      const [num, den] = qtyRaw.split('/').map(Number);
      qty = den ? num / den : 0;
    } else {
      qty = parseFloat(qtyRaw) || 0;
    }
  }
  if (!name) {
    name = trimmed;
    unit = '';
    qty = 0;
  }
  return { qty, unit: unit || '', name: name.trim() };
}

async function saveForm() {
  const title = els.fTitle.value.trim();
  if (!title) {
    els.fTitle.focus();
    showToast('Please give your recipe a title');
    return;
  }

  const ingredientLines = els.fIngredients.value.split('\n').map((l) => l.trim()).filter(Boolean);
  const stepLines = els.fSteps.value.split('\n').map((l) => l.trim()).filter(Boolean);

  if (ingredientLines.length === 0 || stepLines.length === 0) {
    showToast('Add at least one ingredient and one step');
    return;
  }

  const payload = {
    title,
    emoji: els.fEmoji.value.trim() || '🍽️',
    category: els.fCategory.value,
    tags: els.fTags.value.split(',').map((t) => t.trim()).filter(Boolean),
    prep: parseInt(els.fPrep.value, 10) || 0,
    cook: parseInt(els.fCook.value, 10) || 0,
    servings: parseInt(els.fServings.value, 10) || 1,
    difficulty: els.fDifficulty.value,
    ingredients: ingredientLines.map(parseIngredientLine).filter(Boolean),
    steps: stepLines,
    notes: els.fNotes.value.trim(),
  };

  const wasEditing = state.editingRecipeId;
  let saved;

  if (state.session) {
    try {
      if (wasEditing) {
        const { data, error } = await db.from('recipes').update(payload)
          .eq('id', wasEditing).select().single();
        if (error) throw error;
        saved = data;
        const idx = state.customRecipes.findIndex((r) => r.id === wasEditing);
        if (idx !== -1) state.customRecipes[idx] = saved;
      } else {
        const { data, error } = await db.from('recipes')
          .insert({ ...payload, user_id: state.session.user.id }).select().single();
        if (error) throw error;
        saved = data;
        state.customRecipes.push(saved);
      }
    } catch (err) {
      showToast('Sync error — try again');
      return;
    }
  } else {
    saved = { id: wasEditing || `custom-${Date.now()}`, ...payload };
    if (wasEditing) {
      const idx = state.customRecipes.findIndex((r) => r.id === wasEditing);
      if (idx !== -1) state.customRecipes[idx] = saved;
    } else {
      state.customRecipes.push(saved);
    }
    persistCustom();
  }

  closeForm();
  renderAll();
  showToast(wasEditing ? 'Recipe updated' : 'Recipe added');
  if (wasEditing) openDetail(saved.id);
}

async function deleteRecipe(id) {
  if (!isCustom(id)) return;
  if (!confirm('Delete this recipe? This can\'t be undone.')) return;

  if (state.session) {
    try {
      const { error } = await db.from('recipes').delete().eq('id', id);
      if (error) throw error;
      await db.from('favorites').delete()
        .eq('user_id', state.session.user.id).eq('recipe_id', id);
    } catch (err) {
      showToast('Sync error — try again');
      return;
    }
  }

  state.customRecipes = state.customRecipes.filter((r) => r.id !== id);
  state.favorites.delete(id);
  if (!state.session) {
    persistCustom();
    persistFavorites();
  }
  closeDetail();
  renderAll();
  showToast('Recipe deleted');
}

/* ---------------------------------------------------------------------- *
 * Toast
 * ---------------------------------------------------------------------- */

let toastTimer = null;
function showToast(message) {
  els.toast.textContent = message;
  els.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { els.toast.hidden = true; }, 2200);
}

/* ---------------------------------------------------------------------- *
 * Theme
 * ---------------------------------------------------------------------- */

function applyTheme(theme) {
  if (theme === 'light' || theme === 'dark') {
    document.documentElement.setAttribute('data-theme', theme);
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

function cycleTheme() {
  const current = localStorage.getItem(STORAGE_KEYS.theme) || 'auto';
  const next = current === 'auto' ? 'light' : current === 'light' ? 'dark' : 'auto';
  localStorage.setItem(STORAGE_KEYS.theme, next);
  applyTheme(next);
  showToast(`Theme: ${next}`);
}

/* ---------------------------------------------------------------------- *
 * Account / cloud sync
 * ---------------------------------------------------------------------- */

function setAuthStatus(message, kind) {
  els.authStatus.textContent = message;
  els.authStatus.hidden = !message;
  els.authStatus.classList.toggle('is-error', kind === 'error');
  els.authStatus.classList.toggle('is-ok', kind === 'ok');
}

function renderAccountView() {
  const signedIn = !!state.session;
  els.accountUnconfigured.hidden = SUPABASE_CONFIGURED;
  els.accountSignedOut.hidden = !SUPABASE_CONFIGURED || signedIn;
  els.accountSignedIn.hidden = !SUPABASE_CONFIGURED || !signedIn;
  els.accountTabLabel.textContent = signedIn ? 'Synced' : 'Account';
  if (signedIn) {
    els.accountEmail.textContent = state.session.user.email;
  }
}

/** Loads this user's recipes and favorites from Supabase into state, replacing any local-only data cache in memory. */
async function loadCloudData() {
  const [{ data: recipes, error: recipesErr }, { data: favs, error: favsErr }] = await Promise.all([
    db.from('recipes').select('*').order('created_at', { ascending: true }),
    db.from('favorites').select('recipe_id'),
  ]);
  if (recipesErr || favsErr) {
    showToast('Could not load your synced data');
    return;
  }
  state.customRecipes = recipes || [];
  state.favorites = new Set((favs || []).map((f) => f.recipe_id));
}

/** Offers to copy any device-local recipes/favorites up to the signed-in account, once. */
async function maybeMigrateLocalToCloud() {
  const localRecipes = loadJSON(STORAGE_KEYS.custom, []);
  const localFavIds = loadJSON(STORAGE_KEYS.favorites, []);
  if (localRecipes.length === 0 && localFavIds.length === 0) return;

  const proceed = confirm(
    `You have ${localRecipes.length} local recipe(s) and ${localFavIds.length} favorite(s) saved on this device. Import them into your account?`
  );
  if (!proceed) return;

  const idMap = {};
  for (const r of localRecipes) {
    const { id, ...payload } = r;
    const { data, error } = await db.from('recipes')
      .insert({ ...payload, user_id: state.session.user.id }).select().single();
    if (!error && data) idMap[id] = data.id;
  }

  const favRows = localFavIds.map((fid) => ({
    user_id: state.session.user.id,
    recipe_id: idMap[fid] || fid,
  }));
  if (favRows.length) {
    await db.from('favorites').upsert(favRows, { onConflict: 'user_id,recipe_id' });
  }

  localStorage.removeItem(STORAGE_KEYS.custom);
  localStorage.removeItem(STORAGE_KEYS.favorites);
  showToast('Local recipes imported');
}

async function onAuthStateResolved(session) {
  const gainedSession = !state.session && !!session;
  state.session = session;
  renderAccountView();

  if (gainedSession) {
    await maybeMigrateLocalToCloud();
    await loadCloudData();
  } else if (!session) {
    state.customRecipes = loadJSON(STORAGE_KEYS.custom, []);
    state.favorites = new Set(loadJSON(STORAGE_KEYS.favorites, []));
  }
  renderAll();
}

async function initAuth() {
  renderAccountView();
  if (!SUPABASE_CONFIGURED) return;

  const { data: { session } } = await db.auth.getSession();
  await onAuthStateResolved(session);

  db.auth.onAuthStateChange((_event, session) => {
    onAuthStateResolved(session);
  });
}

async function handleSignIn(e) {
  e.preventDefault();
  const email = els.authEmail.value.trim();
  const password = els.authPassword.value;
  if (!email || !password) return;
  setAuthStatus('Signing in…');
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error) {
    setAuthStatus(error.message, 'error');
  } else {
    setAuthStatus('');
    els.authForm.reset();
  }
}

async function handleSignUp() {
  const email = els.authEmail.value.trim();
  const password = els.authPassword.value;
  if (!email || !password) {
    setAuthStatus('Enter an email and password first', 'error');
    return;
  }
  setAuthStatus('Creating account…');
  const { data, error } = await db.auth.signUp({ email, password });
  if (error) {
    setAuthStatus(error.message, 'error');
  } else if (!data.session) {
    setAuthStatus('Check your email to confirm your account', 'ok');
  } else {
    setAuthStatus('');
    els.authForm.reset();
  }
}

async function handleSignOut() {
  await db.auth.signOut();
}

/* ---------------------------------------------------------------------- *
 * Event wiring
 * ---------------------------------------------------------------------- */

function init() {
  populateCategorySelect();
  renderCategoryChips();
  renderAll();
  applyTheme(localStorage.getItem(STORAGE_KEYS.theme) || 'auto');
  initAuth();

  els.searchInput.addEventListener('input', (e) => {
    state.searchTerm = e.target.value;
    renderBrowse();
  });

  els.tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  els.addRecipeFab.addEventListener('click', () => openForm(null));
  els.themeToggle.addEventListener('click', cycleTheme);

  els.detailClose.addEventListener('click', closeDetail);
  els.detailFavToggle.addEventListener('click', () => toggleFavorite(state.activeRecipeId));
  els.detailEdit.addEventListener('click', () => openForm(state.activeRecipeId));
  els.detailDelete.addEventListener('click', () => deleteRecipe(state.activeRecipeId));
  els.servingsMinus.addEventListener('click', () => changeServings(-1));
  els.servingsPlus.addEventListener('click', () => changeServings(1));

  els.formClose.addEventListener('click', closeForm);
  els.formSave.addEventListener('click', saveForm);
  els.recipeForm.addEventListener('submit', (e) => { e.preventDefault(); saveForm(); });

  els.authForm.addEventListener('submit', handleSignIn);
  els.authSignUp.addEventListener('click', handleSignUp);
  els.authSignOut.addEventListener('click', handleSignOut);

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!els.formOverlay.hidden) closeForm();
    else if (!els.detailOverlay.hidden) closeDetail();
  });

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    });
  }
}

document.addEventListener('DOMContentLoaded', init);
