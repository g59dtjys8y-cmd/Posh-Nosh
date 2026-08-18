'use strict';

/* ---------------------------------------------------------------------- *
 * Supabase — optional cloud sync
 * Replace these with your own project's values (Settings → API) to enable
 * sign-in and cross-device sync. Left as placeholders, the app runs fully
 * offline on local storage. See README.md for setup steps.
 * ---------------------------------------------------------------------- */

const SUPABASE_URL = 'https://ztvingythtzyvcpzcnsq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_dxhK5fsYXDNuFSVXJo1Sug_sX-NeXyf';
const SUPABASE_CONFIGURED = !SUPABASE_URL.includes('YOUR-PROJECT') && !SUPABASE_KEY.includes('YOUR-ANON-KEY');
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
 * State
 * ---------------------------------------------------------------------- */

const SEED_RECIPES = [];

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
  browseEmptyText: $('#browseEmptyText'),
  favoritesGrid: $('#favoritesGrid'),
  favoritesEmpty: $('#favoritesEmpty'),
  mineGrid: $('#mineGrid'),
  mineEmpty: $('#mineEmpty'),
  mineActions: $('#mineActions'),
  deleteAllBtn: $('#deleteAllBtn'),
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
  importSection: $('#importSection'),
  importUrl: $('#importUrl'),
  importFetchBtn: $('#importFetchBtn'),
  importStatus: $('#importStatus'),
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

  const noFilterActive = !term && state.activeCategory === 'All';
  els.browseEmptyText.textContent = noFilterActive && allRecipes().length === 0
    ? 'No recipes yet — tap the + button to add your first one.'
    : 'No recipes match your search.';
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
  els.mineActions.hidden = state.customRecipes.length === 0;
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

  els.importSection.hidden = !!editId;
  els.importUrl.value = '';
  setImportStatus('');
  els.importFetchBtn.disabled = false;
  els.importFetchBtn.textContent = 'Fetch';

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

async function deleteAllRecipes() {
  const count = state.customRecipes.length;
  if (count === 0) return;
  if (!confirm(`Delete all ${count} of your recipe${count === 1 ? '' : 's'}? This can't be undone.`)) return;

  const customIds = state.customRecipes.map((r) => r.id);

  if (state.session) {
    try {
      const { error } = await db.from('recipes').delete().eq('user_id', state.session.user.id);
      if (error) throw error;
      await db.from('favorites').delete()
        .eq('user_id', state.session.user.id).in('recipe_id', customIds);
    } catch (err) {
      showToast('Sync error — try again');
      return;
    }
  }

  state.customRecipes = [];
  customIds.forEach((id) => state.favorites.delete(id));
  if (!state.session) {
    persistCustom();
    persistFavorites();
  }
  renderAll();
  showToast('All recipes deleted');
}

/* ---------------------------------------------------------------------- *
 * Import from URL
 * ---------------------------------------------------------------------- */

function setImportStatus(message, kind) {
  els.importStatus.textContent = message;
  els.importStatus.hidden = !message;
  els.importStatus.classList.toggle('is-error', kind === 'error');
  els.importStatus.classList.toggle('is-ok', kind === 'ok');
}

async function handleImportFetch() {
  const url = els.importUrl.value.trim();
  if (!url) {
    setImportStatus('Paste a recipe URL first', 'error');
    return;
  }
  if (!db) {
    setImportStatus('Connect a Supabase project to use URL import — see the README', 'error');
    return;
  }

  els.importFetchBtn.disabled = true;
  els.importFetchBtn.textContent = 'Fetching…';
  setImportStatus('Fetching and reading the page…');

  try {
    const { data, error } = await db.functions.invoke('fetch-recipe', { body: { url } });
    if (error) throw error;
    if (data.error) {
      setImportStatus(data.error, 'error');
      return;
    }

    const recipe = data.recipe;
    els.fTitle.value = recipe.title || '';
    els.fPrep.value = recipe.prep || '';
    els.fCook.value = recipe.cook || '';
    els.fServings.value = recipe.servings || 4;
    els.fIngredients.value = (recipe.ingredients || []).join('\n');
    els.fSteps.value = (recipe.steps || []).join('\n');
    els.fNotes.value = recipe.notes || '';

    setImportStatus('Imported — review the fields below, then save.', 'ok');
  } catch (err) {
    setImportStatus('Something went wrong reaching that page. Try again, or enter the recipe manually.', 'error');
  } finally {
    els.importFetchBtn.disabled = false;
    els.importFetchBtn.textContent = 'Fetch';
  }
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
  els.accountUnconfigured.hidden = !!db;
  els.accountSignedOut.hidden = !db || signedIn;
  els.accountSignedIn.hidden = !db || !signedIn;
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
  if (!db) return;

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
  els.deleteAllBtn.addEventListener('click', deleteAllRecipes);

  els.detailClose.addEventListener('click', closeDetail);
  els.detailFavToggle.addEventListener('click', () => toggleFavorite(state.activeRecipeId));
  els.detailEdit.addEventListener('click', () => openForm(state.activeRecipeId));
  els.detailDelete.addEventListener('click', () => deleteRecipe(state.activeRecipeId));
  els.servingsMinus.addEventListener('click', () => changeServings(-1));
  els.servingsPlus.addEventListener('click', () => changeServings(1));

  els.formClose.addEventListener('click', closeForm);
  els.formSave.addEventListener('click', saveForm);
  els.recipeForm.addEventListener('submit', (e) => { e.preventDefault(); saveForm(); });
  els.importFetchBtn.addEventListener('click', handleImportFetch);

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
