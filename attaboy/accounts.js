/**
 * Local user accounts, collections, keys, and redeem codes.
 * Stored in localStorage — replace with a server API for production.
 */

const USERS_REGISTRY_KEY = 'attaboy_users_registry';
const CURRENT_USER_KEY = 'attaboy_current_user';
const REDEEM_CODES_KEY = 'attaboy_redeem_codes';
/** Fetched from the repo on GitHub Pages — shared by everyone on the same site URL. */
const SHARED_CODES_PATH = 'data/redeem-codes.json';

let publishedRedeemCodes = {};

/** Built-in codes: 20 keys each, once per user account (keys are normalized, no dashes). */
const HARDCODED_REDEEM_CODES = {
  ATTABOYKEY01: { keys: 20, label: 'ATTABOY-KEY-01' },
  ATTABOYKEY02: { keys: 20, label: 'ATTABOY-KEY-02' },
  ATTABOYKEY03: { keys: 20, label: 'ATTABOY-KEY-03' },
  ATTABOYKEY04: { keys: 20, label: 'ATTABOY-KEY-04' },
  ATTABOYKEY05: { keys: 20, label: 'ATTABOY-KEY-05' },
  ATTABOYKEY06: { keys: 20, label: 'ATTABOY-KEY-06' },
  ATTABOYKEY07: { keys: 20, label: 'ATTABOY-KEY-07' },
  ATTABOYKEY08: { keys: 20, label: 'ATTABOY-KEY-08' },
  ATTABOYKEY09: { keys: 20, label: 'ATTABOY-KEY-09' },
  ATTABOYKEY10: { keys: 20, label: 'ATTABOY-KEY-10' },
};

const STARTING_KEYS = 3;
const MIN_PASSWORD_LENGTH = 4;
const MIN_USERNAME_LENGTH = 3;

const XP_BY_RARITY = {
  Common: 10,
  Uncommon: 25,
  Rare: 50,
  Epic: 100,
  Legendary: 200,
};

const VARIANT_RATES_KEY = 'attaboy_variant_rates';

const CARD_VARIANTS = ['normal', 'foil', 'gold', 'polychrome'];

const VARIANT_LABELS = {
  normal: 'Standard',
  foil: 'Foil',
  gold: 'Gold',
  polychrome: 'Polychrome',
};

/** Drop chance percent for special editions (checked in order: polychrome → gold → foil). */
const DEFAULT_VARIANT_RATES = {
  foil: 8,
  gold: 2,
  polychrome: 0.5,
};

const XP_MULTIPLIER_BY_VARIANT = {
  normal: 1,
  foil: 1.5,
  gold: 2.5,
  polychrome: 5,
};

function createEmptyVariants() {
  return {
    normal: { count: 0, xp: 0 },
    foil: { count: 0, xp: 0 },
    gold: { count: 0, xp: 0 },
    polychrome: { count: 0, xp: 0 },
  };
}

function loadVariantRates() {
  try {
    const raw = localStorage.getItem(VARIANT_RATES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return { ...DEFAULT_VARIANT_RATES, ...parsed };
      }
    }
  } catch (e) {
    console.warn('Failed to load variant rates:', e);
  }
  localStorage.setItem(VARIANT_RATES_KEY, JSON.stringify(DEFAULT_VARIANT_RATES));
  return { ...DEFAULT_VARIANT_RATES };
}

function saveVariantRates(rates) {
  localStorage.setItem(VARIANT_RATES_KEY, JSON.stringify(rates));
}

/**
 * Roll card edition. Rarer tiers are checked first (polychrome, then gold, then foil).
 * @param {Object} [rates]
 * @returns {'normal'|'foil'|'gold'|'polychrome'}
 */
function rollCardVariant(rates) {
  const r = loadVariantRates();
  const merged = { ...r, ...rates };
  const poly = Math.max(0, Number(merged.polychrome) || 0);
  const gold = Math.max(0, Number(merged.gold) || 0);
  const foil = Math.max(0, Number(merged.foil) || 0);
  const roll = Math.random() * 100;
  if (roll < poly) return 'polychrome';
  if (roll < poly + gold) return 'gold';
  if (roll < poly + gold + foil) return 'foil';
  return 'normal';
}

function migrateCollectionEntry(entry) {
  if (!entry) return { variants: createEmptyVariants() };
  if (entry.variants) return entry;
  const variants = createEmptyVariants();
  if ((entry.count || 0) > 0 || (entry.xp || 0) > 0) {
    variants.normal.count = entry.count || 0;
    variants.normal.xp = entry.xp || 0;
  }
  entry.variants = variants;
  delete entry.count;
  delete entry.xp;
  delete entry.level;
  return entry;
}

function ensureCardCollection(user, attaboyId) {
  if (!user.collection[attaboyId]) {
    user.collection[attaboyId] = { variants: createEmptyVariants() };
  }
  return migrateCollectionEntry(user.collection[attaboyId]);
}

function getVariantEntry(user, attaboyId, variant) {
  const card = ensureCardCollection(user, attaboyId);
  return card.variants[variant] || card.variants.normal;
}

function getCardTotalCount(entry) {
  const card = migrateCollectionEntry(entry);
  return CARD_VARIANTS.reduce((sum, v) => sum + (card.variants[v].count || 0), 0);
}

function cardHasAnyOwned(entry) {
  return getCardTotalCount(entry) > 0;
}

function getUserCollectionStats(user) {
  let unique = 0;
  let totalPulls = 0;
  const byVariant = { normal: 0, foil: 0, gold: 0, polychrome: 0 };

  Object.values(user.collection || {}).forEach(entry => {
    const card = migrateCollectionEntry(entry);
    let cardTotal = 0;
    CARD_VARIANTS.forEach(v => {
      const n = card.variants[v].count || 0;
      byVariant[v] += n;
      cardTotal += n;
    });
    if (cardTotal > 0) unique += 1;
    totalPulls += cardTotal;
  });

  return { unique, totalPulls, byVariant };
}

/** Cumulative XP required to reach this level (level 1 = 0). */
function xpRequiredForLevel(level) {
  if (level <= 1) return 0;
  return 50 * (level - 1) * level;
}

function getLevelFromXp(xp) {
  let level = 1;
  while (xp >= xpRequiredForLevel(level + 1)) {
    level += 1;
  }
  return level;
}

function getXpProgress(xp) {
  const level = getLevelFromXp(xp);
  const floor = xpRequiredForLevel(level);
  const ceiling = xpRequiredForLevel(level + 1);
  const into = xp - floor;
  const span = ceiling - floor;
  return {
    level,
    into,
    span,
    pct: span > 0 ? Math.min(100, Math.round((into / span) * 100)) : 100,
  };
}

async function hashPassword(password) {
  const data = new TextEncoder().encode(password);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function loadUsersRegistry() {
  try {
    const raw = localStorage.getItem(USERS_REGISTRY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (e) {
    console.warn('Failed to load users registry:', e);
  }
  return {};
}

function saveUsersRegistry(registry) {
  localStorage.setItem(USERS_REGISTRY_KEY, JSON.stringify(registry));
}

function loadRedeemCodes() {
  try {
    const raw = localStorage.getItem(REDEEM_CODES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (e) {
    console.warn('Failed to load redeem codes:', e);
  }
  return {};
}

function saveRedeemCodes(codes) {
  localStorage.setItem(REDEEM_CODES_KEY, JSON.stringify(codes));
}

function normalizeUsername(name) {
  return String(name || '').trim().toLowerCase();
}

/** Match codes whether the user types dashes/spaces or not (352E-RRER === 352ERRER). */
function normalizeCode(code) {
  return String(code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function formatCodeLabel(code, record) {
  if (record && record.label) return record.label;
  if (code.length === 8) {
    return `${code.slice(0, 4)}-${code.slice(4)}`;
  }
  return code;
}

function purgeLocalCodesNowPublished() {
  const local = loadRedeemCodes();
  let changed = false;
  Object.keys(publishedRedeemCodes).forEach(code => {
    if (local[code]) {
      delete local[code];
      changed = true;
    }
  });
  if (changed) saveRedeemCodes(local);
}

function createEmptyCollection() {
  return {};
}

function createUserRecord(username, passwordHash) {
  return {
    username,
    passwordHash,
    keys: STARTING_KEYS,
    collection: createEmptyCollection(),
    createdAt: new Date().toISOString(),
  };
}

function getCurrentUsername() {
  const u = localStorage.getItem(CURRENT_USER_KEY);
  return u ? normalizeUsername(u) : null;
}

function setCurrentUsername(username) {
  if (username) {
    localStorage.setItem(CURRENT_USER_KEY, normalizeUsername(username));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
}

function getCurrentUser() {
  const name = getCurrentUsername();
  if (!name) return null;
  const registry = loadUsersRegistry();
  return registry[name] || null;
}

function saveUser(user) {
  const registry = loadUsersRegistry();
  registry[normalizeUsername(user.username)] = user;
  saveUsersRegistry(registry);
}

function listAllUsers() {
  const registry = loadUsersRegistry();
  return Object.values(registry).sort((a, b) =>
    (a.username || '').localeCompare(b.username || '')
  );
}

async function registerUser(username, password) {
  const name = normalizeUsername(username);
  if (name.length < MIN_USERNAME_LENGTH) {
    return { ok: false, error: `Username must be at least ${MIN_USERNAME_LENGTH} characters.` };
  }
  if (!/^[a-z0-9_]+$/.test(name)) {
    return { ok: false, error: 'Username may only use letters, numbers, and underscores.' };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  const registry = loadUsersRegistry();
  if (registry[name]) {
    return { ok: false, error: 'That username is already taken.' };
  }
  const user = createUserRecord(name, await hashPassword(password));
  registry[name] = user;
  saveUsersRegistry(registry);
  setCurrentUsername(name);
  return { ok: true, user };
}

async function loginUser(username, password) {
  const name = normalizeUsername(username);
  const registry = loadUsersRegistry();
  const user = registry[name];
  if (!user) {
    return { ok: false, error: 'Invalid username or password.' };
  }
  const hash = await hashPassword(password);
  if (hash !== user.passwordHash) {
    return { ok: false, error: 'Invalid username or password.' };
  }
  setCurrentUsername(name);
  return { ok: true, user };
}

function logoutUser() {
  setCurrentUsername(null);
}

function getXpGainForRarity(rarity, variant = 'normal') {
  const base = XP_BY_RARITY[rarity] || XP_BY_RARITY.Common;
  const mult = XP_MULTIPLIER_BY_VARIANT[variant] || 1;
  return Math.round(base * mult);
}

/**
 * Record a gacha pull: consumes one key, rolls edition, updates that variant's count/XP.
 */
function recordGachaPull(user, attaboy) {
  if (!user) return { ok: false, error: 'Not signed in.' };
  if ((user.keys || 0) < 1) {
    return { ok: false, error: 'No open keys left. Redeem a key code or ask an admin for keys.' };
  }

  user.keys -= 1;
  const variant = rollCardVariant();
  const cardEntry = ensureCardCollection(user, attaboy.id);
  const variantEntry = cardEntry.variants[variant];
  const prevLevel = getLevelFromXp(variantEntry.xp);
  const xpGain = getXpGainForRarity(attaboy.rarity, variant);
  variantEntry.count += 1;
  variantEntry.xp += xpGain;
  const newLevel = getLevelFromXp(variantEntry.xp);

  saveUser(user);
  return {
    ok: true,
    variant,
    cardEntry,
    variantEntry,
    xpGain,
    leveledUp: newLevel > prevLevel,
    prevLevel,
    newLevel,
    isSpecialVariant: variant !== 'normal',
  };
}

function hasRedeemedCode(user, code) {
  const list = user.redeemedCodes || [];
  return list.includes(code);
}

function markCodeRedeemed(user, code) {
  if (!user.redeemedCodes) user.redeemedCodes = [];
  if (!user.redeemedCodes.includes(code)) {
    user.redeemedCodes.push(code);
  }
}

function redeemHardcodedCode(user, code) {
  const record = HARDCODED_REDEEM_CODES[code];
  if (!record) return null;
  if (hasRedeemedCode(user, code)) {
    return { ok: false, error: 'You have already redeemed this code.' };
  }
  const keysAdded = record.keys || 20;
  user.keys = (user.keys || 0) + keysAdded;
  markCodeRedeemed(user, code);
  saveUser(user);
  return { ok: true, keysAdded, totalKeys: user.keys };
}

/**
 * Load codes published in data/redeem-codes.json (commit this file to GitHub).
 */
async function loadPublishedRedeemCodes() {
  publishedRedeemCodes = {};
  try {
    const url = new URL(SHARED_CODES_PATH, document.baseURI).href;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      console.warn('Published redeem codes file not found:', res.status);
      return publishedRedeemCodes;
    }
    const data = await res.json();
    const list = Array.isArray(data) ? data : (data.codes || []);
    list.forEach(item => {
      const code = normalizeCode(item.code);
      if (!code) return;
      publishedRedeemCodes[code] = {
        keys: Math.max(1, parseInt(item.keys, 10) || 1),
        createdAt: item.createdAt || null,
        label: item.code || code,
      };
    });
    purgeLocalCodesNowPublished();
  } catch (e) {
    console.warn('Could not load published redeem codes:', e);
  }
  return publishedRedeemCodes;
}

function redeemPublishedCode(user, code) {
  const record = publishedRedeemCodes[code];
  if (!record) return null;
  if (hasRedeemedCode(user, code)) {
    return { ok: false, error: 'You have already redeemed this code.' };
  }
  const keysAdded = record.keys || 1;
  user.keys = (user.keys || 0) + keysAdded;
  markCodeRedeemed(user, code);
  saveUser(user);
  return { ok: true, keysAdded, totalKeys: user.keys };
}

function buildRedeemCodesExport() {
  const codes = Object.entries(publishedRedeemCodes)
    .map(([code, data]) => ({
      code: data.label || formatCodeLabel(code, data),
      keys: data.keys,
      createdAt: data.createdAt || new Date().toISOString(),
    }))
    .sort((a, b) => a.code.localeCompare(b.code));
  return { codes };
}

function downloadRedeemCodesJson(filename = 'redeem-codes.json') {
  const json = JSON.stringify(buildRedeemCodesExport(), null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function redeemKeyCode(username, codeRaw) {
  await loadPublishedRedeemCodes();

  const name = normalizeUsername(username);
  const code = normalizeCode(codeRaw);
  if (!code) return { ok: false, error: 'Enter a key code.' };

  const registry = loadUsersRegistry();
  const user = registry[name];
  if (!user) return { ok: false, error: 'Sign in first.' };

  if (HARDCODED_REDEEM_CODES[code]) {
    return redeemHardcodedCode(user, code);
  }

  const published = redeemPublishedCode(user, code);
  if (published) return published;

  const codes = loadRedeemCodes();
  const record = codes[code];
  if (record && record.usesLeft !== undefined && record.usesLeft <= 0) {
    return {
      ok: false,
      error: 'This code was already used in this browser. Refresh the page — if the code is in data/redeem-codes.json on the site, it should work after reload.',
    };
  }
  if (record) {
    user.keys = (user.keys || 0) + (record.keys || 1);
    if (record.usesLeft !== undefined) {
      record.usesLeft -= 1;
      if (record.usesLeft <= 0) delete codes[code];
      else codes[code] = record;
    }
    saveRedeemCodes(codes);
    saveUser(user);
    return { ok: true, keysAdded: record.keys || 1, totalKeys: user.keys };
  }

  const publishedCount = Object.keys(publishedRedeemCodes).length;
  if (publishedCount === 0) {
    return {
      ok: false,
      error: 'Could not load published codes. Serve the site over http(s) (e.g. python -m http.server), not file://, and ensure data/redeem-codes.json exists.',
    };
  }
  return {
    ok: false,
    error: 'Code not found. Check spelling (dashes optional). After updating redeem-codes.json on GitHub, wait a minute and hard-refresh (Ctrl+F5).',
  };
}

/**
 * Create a shareable code. On GitHub Pages you must download the JSON file
 * and commit data/redeem-codes.json so other visitors can redeem it.
 */
function generateRedeemCode(keys) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let segment = '';
  for (let i = 0; i < 8; i++) {
    segment += chars[Math.floor(Math.random() * chars.length)];
  }
  const code = `${segment.slice(0, 4)}-${segment.slice(4)}`;
  const normalized = normalizeCode(code);
  const keyAmount = Math.max(1, parseInt(keys, 10) || 1);
  publishedRedeemCodes[normalized] = {
    keys: keyAmount,
    createdAt: new Date().toISOString(),
    label: `${segment.slice(0, 4)}-${segment.slice(4)}`,
  };
  return {
    code: formatCodeLabel(normalized, publishedRedeemCodes[normalized]),
    keys: keyAmount,
    usesLeft: 'once per account',
    published: true,
  };
}

function adminGrantKeys(targetUsername, amount) {
  const name = normalizeUsername(targetUsername);
  const n = Math.max(0, parseInt(amount, 10) || 0);
  const registry = loadUsersRegistry();
  const user = registry[name];
  if (!user) return { ok: false, error: 'User not found.' };
  user.keys = (user.keys || 0) + n;
  saveUser(user);
  return { ok: true, user, granted: n };
}

function listRedeemCodes() {
  const builtin = Object.entries(HARDCODED_REDEEM_CODES).map(([code, data]) => ({
    code: formatCodeLabel(code, data),
    keys: data.keys,
    usesLeft: 'once per account',
    source: 'built-in',
  }));
  const published = Object.entries(publishedRedeemCodes).map(([code, data]) => ({
    code: formatCodeLabel(code, data),
    keys: data.keys,
    usesLeft: 'once per account',
    source: 'published',
    createdAt: data.createdAt,
  }));
  const localOnly = Object.entries(loadRedeemCodes()).map(([code, data]) => ({
    code,
    keys: data.keys,
    usesLeft: data.usesLeft,
    createdAt: data.createdAt,
    source: 'this browser only',
  }));
  return [...builtin, ...published, ...localOnly];
}

window.AttaboyAccounts = {
  STARTING_KEYS,
  XP_BY_RARITY,
  CARD_VARIANTS,
  VARIANT_LABELS,
  VARIANT_RATES_KEY,
  DEFAULT_VARIANT_RATES,
  XP_MULTIPLIER_BY_VARIANT,
  getLevelFromXp,
  getXpProgress,
  getXpGainForRarity,
  loadVariantRates,
  saveVariantRates,
  rollCardVariant,
  migrateCollectionEntry,
  ensureCardCollection,
  getVariantEntry,
  getCardTotalCount,
  cardHasAnyOwned,
  getUserCollectionStats,
  getCurrentUsername,
  getCurrentUser,
  setCurrentUsername,
  listAllUsers,
  registerUser,
  loginUser,
  logoutUser,
  recordGachaPull,
  redeemKeyCode,
  generateRedeemCode,
  loadPublishedRedeemCodes,
  buildRedeemCodesExport,
  downloadRedeemCodesJson,
  adminGrantKeys,
  listRedeemCodes,
  HARDCODED_REDEEM_CODES,
  normalizeUsername,
};
