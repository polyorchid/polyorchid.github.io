// Script for Attaboy Gacha Simulator

const AttaboyAccounts = window.AttaboyAccounts;

/*
  Utility: Weighted random selection. This function takes an array of items and an array
  of weights and returns the selected item and its index. The algorithm uses
  cumulative weights to efficiently pick an item based on probabilities. This
  implementation follows the approach described in a DEV Community article on
  weighted random selection【729238645694274†L156-L212】. The cumulative
  weights are built by summing the weight array, then a random number is
  generated in the range [0, sum(weights)). Iterating through the cumulative
  weights, the first index where the cumulative weight is greater than or
  equal to the random number identifies the selected item.
*/
function weightedRandom(items, weights) {
  if (items.length !== weights.length) {
    throw new Error('Items and weights must be of the same length');
  }
  // Build cumulative weights array
  const cumulativeWeights = [];
  for (let i = 0; i < weights.length; i++) {
    cumulativeWeights[i] = weights[i] + (cumulativeWeights[i - 1] || 0);
  }
  const totalWeight = cumulativeWeights[cumulativeWeights.length - 1];
  // Generate a random number in [0, totalWeight)
  const randomNumber = Math.random() * totalWeight;
  // Find the first cumulative weight >= randomNumber
  for (let i = 0; i < cumulativeWeights.length; i++) {
    if (cumulativeWeights[i] >= randomNumber) {
      return { item: items[i], index: i };
    }
  }
  // Fallback in case of rounding errors
  return { item: items[items.length - 1], index: items.length - 1 };
}

// Default attaboy data. Each attaboy has an ID, name, affirmation note,
// rarity and an optional image. The image field points at a file in the
// `photos` directory matching the ID. If the image file does not exist
// (or fails to load), the letter avatar will be used instead. These
// defaults will be used if no custom data is saved in localStorage.
const defaultAttaboys = [
  {
    id: 'a1',
    name: 'Taylor Chamberlain',
    note: 'Keep building on this momentum the quality of your work is showing.',
    rarity: 'Common',
    image: 'photos/a1.png',
  },
  {
    id: 'a2',
    name: 'Taylor Achterberg',
    note: 'You\'re setting a strong example with the effort and attention you\'re giving your calls.',
    rarity: 'Common',
    image: 'photos/a2.png',
  },
  {
    id: 'a3',
    name: 'Zaida Villages',
    note: 'Estás haciendo un excelente trabajo, En tus llamadas, eres amigable, bastante profesional.',
    rarity: 'Common',
    image: 'photos/a3.png',
  },
  {
    id: 'a4',
    name: 'Kathia Garcia',
    note: 'Thanks for your positivity and energy. You keep us motivated.',
    rarity: 'Common',
    image: 'photos/a4.png',
  },
  {
    id: 'a5',
    name: 'Rose Tello',
    note: 'I want to recognize the great work that you have been doing. Your excellent quality of work, hard work, and dedication do not go unnoticed.',
    rarity: 'Rare',
    image: 'photos/a5.png',
  },
  {
    id: 'a6',
    name: 'Brianna McGinnis',
    note: 'Thank you for the effort and commitment you bring every day.',
    rarity: 'Rare',
    image: 'photos/a6.png',
  },
  {
    id: 'a7',
    name: 'Arcenio Martinez',
    note: 'I see your having fun with this putting on a show really establishing yourself as a top performer.',
    rarity: 'Rare',
    image: 'photos/a7.png',
  },
  {
    id: 'a8',
    name: 'Caleb Cagle',
    note: 'Keep killing it!',
    rarity: 'Epic',
    image: 'photos/a8.png',
  },
  {
    id: 'a9',
    name: 'Alex Hardbarger',
    note: 'Keep up the great work Bestie!',
    rarity: 'Epic',
    image: 'photos/a9.png',
  },
  {
    id: 'a10',
    name: 'Sadie King',
    note: 'Thank you for showing up, caring, and giving your best every day. Your effort makes a difference, helps this team succeed, and is appreciated more than you probably realize.',
    rarity: 'Legendary',
    image: 'photos/a10.png',
  },
  {
    id: 'a11',
    name: 'Clint Adams',
    note: 'Your communication skills help our team collaborate effectively.',
    rarity: 'Legendary',
    image: 'photos/a11.png',
  },
];

// Default rarity weights. Higher numbers make a rarity more common. These values
// can be adjusted by the user and persisted using localStorage. Only positive
// numbers make sense here. Feel free to tweak the defaults for your needs.
const defaultRarityWeights = {
  Common: 50,
  Uncommon: 30,
  Rare: 5,
  Epic: 2,
  Legendary: 1,
};

// Local storage keys for persisting attaboys and rarity weights
const ATTABOYS_KEY = 'attaboy_gacha_items';
const WEIGHTS_KEY = 'attaboy_gacha_weights';

/**
 * Retrieve attaboys from localStorage or return default. We parse the stored
 * JSON data and validate that it is an array. If the stored data is
 * corrupted, we return the default array and overwrite the storage.
 */
function loadAttaboys() {
  try {
    const stored = localStorage.getItem(ATTABOYS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse attaboys from localStorage:', e);
  }
  // Persist default items on first load
  localStorage.setItem(ATTABOYS_KEY, JSON.stringify(defaultAttaboys));
  return [...defaultAttaboys];
}

/**
 * Save the current attaboys array to localStorage as a JSON string. We store
 * a deep copy to avoid accidental references to the original array.
 * @param {Array} items
 */
function saveAttaboys(items) {
  localStorage.setItem(ATTABOYS_KEY, JSON.stringify(items));
}

/**
 * Retrieve rarity weights from localStorage or return default. We parse the
 * stored JSON and ensure all required rarities exist. Missing values are
 * replaced with defaults. If storage is invalid, default weights are saved
 * and returned.
 */
function loadRarityWeights() {
  try {
    const stored = localStorage.getItem(WEIGHTS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === 'object') {
        const weights = { ...defaultRarityWeights, ...parsed };
        return weights;
      }
    }
  } catch (e) {
    console.warn('Failed to parse weights from localStorage:', e);
  }
  localStorage.setItem(WEIGHTS_KEY, JSON.stringify(defaultRarityWeights));
  return { ...defaultRarityWeights };
}

/**
 * Save the current rarity weights to localStorage.
 * @param {Object} weights
 */
function saveRarityWeights(weights) {
  localStorage.setItem(WEIGHTS_KEY, JSON.stringify(weights));
}

// Admin password. This simple client-side password is used to unlock the
// administrative panel. In a real application this would be handled on
// the server. The password can be changed here as desired.
const ADMIN_PASSWORD = 'attaboyadmin';

// Key used to persist the admin unlocked state in localStorage. If this
// value exists and is truthy, the admin panel will be displayed on load.
const ADMIN_UNLOCKED_KEY = 'attaboy_admin_unlocked';

// In-memory data structures. After loading from localStorage we ensure
// that each attaboy has an image field pointing to its photo. If the
// property is missing (from older versions of the app), we infer the
// default based on the ID (photos/{id}.png).
let attaboys = loadAttaboys().map(item => {
  // Ensure each attaboy has an absolute image URL for its photo. If the
  // existing image field is relative (does not include a scheme), build
  // an absolute URL based off the current page. This allows local images
  // in the photos directory to load reliably in file:// contexts.
  if (item.id) {
    const needsUpdate = !item.image || !/^[a-zA-Z]+:\/\//.test(item.image);
    if (needsUpdate) {
      // Build a relative path to the photos directory. We avoid constructing
      // absolute file URLs because many browsers restrict cross-file access
      // when using file:// origins. A relative path ensures the images are
      // loaded from the same directory tree as index.html.
      item.image = `photos/${item.id}.png`;
    }
  }
  return item;
});
let rarityWeights = loadRarityWeights();
let variantRates = AttaboyAccounts.loadVariantRates();

// DOM references
const resultContainer = document.getElementById('result');
const openBtn = document.getElementById('openBtn');
const attaboyList = document.getElementById('attaboy-list');
const saveWeightsBtn = document.getElementById('save-weights');
const saveVariantRatesBtn = document.getElementById('save-variant-rates');
const gachaSubtitle = document.getElementById('gacha-subtitle');
const gachaKeysDisplay = document.getElementById('gacha-keys-display');
const gachaHint = document.getElementById('gacha-hint');
const userStatusBar = document.getElementById('user-status-bar');
const statusUsername = document.getElementById('status-username');
const statusKeys = document.getElementById('status-keys');

// Account UI
const accountGuest = document.getElementById('account-guest');
const accountUser = document.getElementById('account-user');
const registerForm = document.getElementById('register-form');
const loginForm = document.getElementById('login-form');
const redeemForm = document.getElementById('redeem-form');
const userLogoutBtn = document.getElementById('user-logout-btn');
const userCollectionList = document.getElementById('user-collection-list');
const collectionSubtitle = document.getElementById('collection-subtitle');
const collectionEmpty = document.getElementById('collection-empty');
const grantKeysForm = document.getElementById('grant-keys-form');
const createCodeForm = document.getElementById('create-code-form');
const adminUsersList = document.getElementById('admin-users-list');
const redeemCodesList = document.getElementById('redeem-codes-list');

// Tab navigation
const tabButtons = document.querySelectorAll('.tab-btn');
const pages = {
  home: document.getElementById('page-home'),
  gacha: document.getElementById('page-gacha'),
  collection: document.getElementById('page-collection'),
  account: document.getElementById('page-account'),
  admin: document.getElementById('page-admin'),
};

// Admin related DOM references
const adminTabBtn = document.getElementById('tab-admin');
const adminContent = document.getElementById('adminContent');
const adminLoginDialog = document.getElementById('admin-login-dialog');
const adminLoginForm = document.getElementById('admin-login-form');
const openAdminLoginBtn = document.getElementById('open-admin-login');
const closeAdminLoginBtn = document.getElementById('close-admin-login');
const cancelAdminLoginBtn = document.getElementById('cancel-admin-login');
const adminPasswordInput = document.getElementById('admin-password-input');
const adminLoginBtn = document.getElementById('admin-login-btn');
const adminLogoutBtn = document.getElementById('admin-logout-btn');
const loginErrorMsg = document.getElementById('login-error');

function isAdminUnlocked() {
  return localStorage.getItem(ADMIN_UNLOCKED_KEY) === 'true';
}

function setAdminUnlocked(unlocked) {
  if (unlocked) {
    localStorage.setItem(ADMIN_UNLOCKED_KEY, 'true');
  } else {
    localStorage.removeItem(ADMIN_UNLOCKED_KEY);
  }
  updateAdminAccess();
}

function updateAdminAccess() {
  const unlocked = isAdminUnlocked();
  if (adminTabBtn) adminTabBtn.hidden = !unlocked;
  if (adminContent) adminContent.hidden = !unlocked;
  if (!unlocked) {
    const activeAdminTab = document.querySelector('.tab-btn.active[data-tab="admin"]');
    if (activeAdminTab || (pages.admin && pages.admin.classList.contains('page-active'))) {
      switchTab('home');
    }
  }
}

function openAdminLoginModal() {
  if (!adminLoginDialog) return;
  if (loginErrorMsg) loginErrorMsg.hidden = true;
  if (adminPasswordInput) adminPasswordInput.value = '';
  adminLoginDialog.showModal();
  if (adminPasswordInput) adminPasswordInput.focus();
}

function closeAdminLoginModal() {
  if (!adminLoginDialog) return;
  adminLoginDialog.close();
  if (loginErrorMsg) loginErrorMsg.hidden = true;
  if (adminPasswordInput) adminPasswordInput.value = '';
}

// Rarity input references
const rarityInputs = {
  Common: document.getElementById('weight-common'),
  Uncommon: document.getElementById('weight-uncommon'),
  Rare: document.getElementById('weight-rare'),
  Epic: document.getElementById('weight-epic'),
  Legendary: document.getElementById('weight-legendary'),
};

/**
 * Render the attaboy collection list. Each card shows the manager's avatar,
 * name, note, rarity and a dropdown for changing the rarity. When a rarity is
 * changed, the underlying data and localStorage are updated accordingly.
 */
function renderAttaboyList() {
  attaboyList.innerHTML = '';
  attaboys.forEach((item, index) => {
    // Create card
    const card = document.createElement('div');
    card.classList.add('attaboy-card', item.rarity.toLowerCase());
    // Card top section with avatar and name
    const top = document.createElement('div');
    top.classList.add('card-top');

    // Avatar container which holds either an image or a letter fallback
    const avatarContainer = document.createElement('div');
    avatarContainer.style.position = 'relative';

    // Image element for photo. On error the fallback letter will remain.
    const img = document.createElement('img');
    img.classList.add('avatar-img');
    // Letter fallback avatar, hidden by default. It will be shown only if the
    // image fails to load.
    const letterAvatar = document.createElement('div');
    letterAvatar.classList.add('avatar', `rarity-${item.rarity.toLowerCase()}`);
    letterAvatar.textContent = item.name.charAt(0);
    letterAvatar.style.display = 'none';

    // When the image loads successfully, ensure the letter fallback stays hidden
    img.onload = () => {
      letterAvatar.style.display = 'none';
    };
    img.onerror = () => {
      img.style.display = 'none';
      letterAvatar.style.display = 'flex';
    };
    // Assign src after setting handlers to ensure events fire correctly
    if (item.image) {
      // Compute an absolute URL for the image based on the current page.
      // Using new URL ensures that relative paths resolve correctly even when
      // the app is loaded via the file:// protocol. Without this, Chrome may
      // treat a relative path as rooted at the drive rather than the app
      // directory, causing images not to load.
      try {
        const absolute = new URL(item.image, document.baseURI).href;
        img.src = absolute;
      } catch (e) {
        // Fallback to the raw relative path if URL construction fails
        img.src = item.image;
      }
    }

    avatarContainer.appendChild(img);
    avatarContainer.appendChild(letterAvatar);

    const nameElem = document.createElement('div');
    nameElem.classList.add('name');
    nameElem.textContent = item.name;

    top.appendChild(avatarContainer);
    top.appendChild(nameElem);

    // Note text
    const note = document.createElement('p');
    note.classList.add('note');
    note.textContent = item.note;

    // Rarity select dropdown
    const raritySelect = document.createElement('select');
    ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'].forEach(r => {
      const opt = document.createElement('option');
      opt.value = r;
      opt.textContent = r;
      if (r === item.rarity) {
        opt.selected = true;
      }
      raritySelect.appendChild(opt);
    });
    raritySelect.addEventListener('change', () => {
      const newRarity = raritySelect.value;
      attaboys[index].rarity = newRarity;
      saveAttaboys(attaboys);
      renderAttaboyList();
    });

    // Append children to card
    card.appendChild(top);
    card.appendChild(note);
    card.appendChild(raritySelect);

    attaboyList.appendChild(card);
  });
}

/**
 * Render current rarity weights into the input fields. Converts numeric
 * values to string for proper display. Called on initial load and after
 * saving weights.
 */
function renderRarityWeights() {
  Object.keys(rarityWeights).forEach(rarity => {
    const input = rarityInputs[rarity];
    if (input) {
      input.value = rarityWeights[rarity];
    }
  });
}

function getCollectionStats(user) {
  return AttaboyAccounts.getUserCollectionStats(user);
}

function refreshUserUI() {
  const user = AttaboyAccounts.getCurrentUser();
  const signedIn = !!user;

  if (userStatusBar) userStatusBar.hidden = !signedIn;
  if (signedIn) {
    if (statusUsername) statusUsername.textContent = user.username;
    if (statusKeys) statusKeys.textContent = `🔑 ${user.keys}`;
    if (gachaKeysDisplay) gachaKeysDisplay.textContent = `🔑 ${user.keys}`;
  } else if (gachaKeysDisplay) {
    gachaKeysDisplay.textContent = '🔑 —';
  }

  if (accountGuest) accountGuest.hidden = signedIn;
  if (accountUser) accountUser.hidden = !signedIn;

  if (signedIn) {
    const stats = getCollectionStats(user);
    const el = id => document.getElementById(id);
    if (el('profile-username')) el('profile-username').textContent = user.username;
    if (el('profile-keys')) el('profile-keys').textContent = user.keys;
    if (el('profile-unique')) el('profile-unique').textContent = stats.unique;
    if (el('profile-total-pulls')) el('profile-total-pulls').textContent = stats.totalPulls;
  }

  if (gachaSubtitle) {
    gachaSubtitle.textContent = signedIn
      ? 'Each open costs 1 key. You may roll Foil, Gold, or Polychrome editions — tracked separately in Collection.'
      : 'Sign in on the Account tab to use your open keys.';
  }

  if (openBtn) {
    const canOpen = signedIn && user.keys > 0 && attaboys.length > 0;
    openBtn.disabled = !canOpen;
    if (!signedIn) {
      if (gachaHint) gachaHint.textContent = 'Sign in to open Attaboys.';
    } else if (user.keys < 1) {
      if (gachaHint) gachaHint.textContent = 'No keys left — redeem a code on Account or ask an admin.';
    } else {
      if (gachaHint) gachaHint.textContent = '';
    }
  }

  if (collectionSubtitle) {
    collectionSubtitle.textContent = signedIn
      ? 'Each manager shows Standard, Foil, Gold, and Polychrome copies separately.'
      : 'Sign in to view the Attaboys you have opened.';
  }

  renderUserCollection();
  if (isAdminUnlocked()) {
    renderAdminUsersList();
    renderRedeemCodesList();
  }
}

function buildAvatarNodes(item) {
  const avatarContainer = document.createElement('div');
  avatarContainer.className = 'avatar-wrap';

  const img = document.createElement('img');
  img.classList.add('avatar-img');
  const letterAvatar = document.createElement('div');
  letterAvatar.classList.add('avatar', `rarity-${item.rarity.toLowerCase()}`);
  letterAvatar.textContent = item.name.charAt(0);
  letterAvatar.style.display = 'none';

  img.onload = () => { letterAvatar.style.display = 'none'; };
  img.onerror = () => {
    img.style.display = 'none';
    letterAvatar.style.display = 'flex';
  };

  if (item.image) {
    try {
      img.src = new URL(item.image, document.baseURI).href;
    } catch (e) {
      img.src = item.image;
    }
  }

  avatarContainer.appendChild(img);
  avatarContainer.appendChild(letterAvatar);
  return avatarContainer;
}

function renderUserCollection() {
  if (!userCollectionList) return;
  const user = AttaboyAccounts.getCurrentUser();
  userCollectionList.innerHTML = '';

  if (!user) {
    if (collectionEmpty) {
      collectionEmpty.hidden = false;
      collectionEmpty.textContent = 'Sign in on the Account tab to see your collection.';
    }
    return;
  }

  const owned = attaboys
    .map(ab => {
      const raw = user.collection[ab.id];
      if (!raw || !AttaboyAccounts.cardHasAnyOwned(raw)) return null;
      const entry = AttaboyAccounts.migrateCollectionEntry(raw);
      return { attaboy: ab, entry };
    })
    .filter(Boolean);

  if (collectionEmpty) {
    collectionEmpty.hidden = owned.length > 0;
    collectionEmpty.textContent = 'No Attaboys yet. Use an open key on the Open tab!';
  }

  owned.forEach(({ attaboy, entry }) => {
    const card = document.createElement('article');
    card.className = `user-collection-card attaboy-card ${attaboy.rarity.toLowerCase()}`;

    const top = document.createElement('div');
    top.className = 'card-top';
    top.appendChild(buildAvatarNodes(attaboy));

    const meta = document.createElement('div');
    meta.className = 'user-collection-meta';
    const total = AttaboyAccounts.getCardTotalCount(entry);
    meta.innerHTML = `
      <div class="name">${escapeHtml(attaboy.name)}</div>
      <div class="user-collection-badges">
        <span class="badge badge-count">${total} total</span>
        <span class="badge badge-rarity">${escapeHtml(attaboy.rarity)}</span>
      </div>
    `;
    top.appendChild(meta);
    card.appendChild(top);

    const variantsEl = document.createElement('div');
    variantsEl.className = 'variant-rows';

    AttaboyAccounts.CARD_VARIANTS.forEach(variantKey => {
      const v = entry.variants[variantKey];
      if (!v || v.count < 1) return;

      const progress = AttaboyAccounts.getXpProgress(v.xp);
      const level = AttaboyAccounts.getLevelFromXp(v.xp);
      const row = document.createElement('div');
      row.className = `variant-row variant-row-${variantKey}`;
      row.innerHTML = `
        <div class="variant-row-head">
          <span class="badge badge-variant badge-variant-${variantKey}">${escapeHtml(AttaboyAccounts.VARIANT_LABELS[variantKey])}</span>
          <span class="variant-row-stats">×${v.count} · Lv ${level}</span>
        </div>
        <div class="xp-bar xp-bar-sm">
          <div class="xp-bar-fill" style="width:${progress.pct}%"></div>
          <span class="xp-bar-label">${v.xp} XP</span>
        </div>
      `;
      variantsEl.appendChild(row);
    });

    card.appendChild(variantsEl);

    const note = document.createElement('p');
    note.className = 'note';
    note.textContent = attaboy.note;
    card.appendChild(note);

    userCollectionList.appendChild(card);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderAdminUsersList() {
  if (!adminUsersList) return;
  adminUsersList.innerHTML = '';
  const users = AttaboyAccounts.listAllUsers();
  if (!users.length) {
    adminUsersList.innerHTML = '<li class="admin-users-empty">No users registered yet.</li>';
    return;
  }
  users.forEach(user => {
    const stats = getCollectionStats(user);
    const li = document.createElement('li');
    li.className = 'admin-user-row';
    li.innerHTML = `
      <strong>${escapeHtml(user.username)}</strong>
      <span>🔑 ${user.keys}</span>
      <span>${stats.unique} unique · ${stats.totalPulls} pulls</span>
    `;
    adminUsersList.appendChild(li);
  });
}

function renderRedeemCodesList() {
  if (!redeemCodesList) return;
  redeemCodesList.innerHTML = '';
  const codes = AttaboyAccounts.listRedeemCodes();
  if (!codes.length) {
    redeemCodesList.innerHTML = '<li class="admin-users-empty">No active codes.</li>';
    return;
  }
  codes.forEach(({ code, keys, usesLeft, source }) => {
    const li = document.createElement('li');
    li.className = 'redeem-code-row';
    const usesLabel = typeof usesLeft === 'number'
      ? `${usesLeft} use(s) left`
      : usesLeft;
    li.innerHTML = `<code>${escapeHtml(code)}</code> — ${keys} key(s) · ${escapeHtml(source || '')} · ${escapeHtml(String(usesLabel))}`;
    redeemCodesList.appendChild(li);
  });
}

/**
 * Handle the gacha roll. Requires sign-in and consumes one open key.
 */
function openAttaboy() {
  const user = AttaboyAccounts.getCurrentUser();
  if (!user) {
    switchTab('account');
    return;
  }
  if (!attaboys.length) return;

  const weights = attaboys.map(item =>
    Math.max(Number(rarityWeights[item.rarity]) || 0, 0)
  );
  const { item } = weightedRandom(attaboys, weights);
  const pull = AttaboyAccounts.recordGachaPull(user, item);

  if (!pull.ok) {
    if (gachaHint) gachaHint.textContent = pull.error;
    refreshUserUI();
    return;
  }

  showResult(item, pull);
  refreshUserUI();
}

/**
 * Display the result card for the selected attaboy.
 * @param {Object} item
 * @param {Object} [pull] - Result from recordGachaPull
 */
function showResult(item, pull) {
  resultContainer.innerHTML = '';
  const card = document.createElement('div');
  const variant = pull?.variant || 'normal';
  card.classList.add('result-card', item.rarity.toLowerCase(), `variant-${variant}`);
  card.appendChild(buildAvatarNodes(item));

  const content = document.createElement('div');
  content.classList.add('card-content');
  const heading = document.createElement('h3');
  heading.textContent = `${item.name} — ${item.rarity}`;
  content.appendChild(heading);

  if (pull && pull.ok && variant !== 'normal') {
    const variantBadge = document.createElement('p');
    variantBadge.className = `pull-variant-badge badge-variant badge-variant-${variant}`;
    variantBadge.textContent = AttaboyAccounts.VARIANT_LABELS[variant];
    content.appendChild(variantBadge);
  }

  const note = document.createElement('p');
  note.textContent = item.note;
  content.appendChild(note);

  if (pull && pull.ok) {
    const meta = document.createElement('p');
    meta.className = 'pull-meta';
    const edition = AttaboyAccounts.VARIANT_LABELS[pull.variant];
    let text = `${edition} · +${pull.xpGain} XP · Copy #${pull.variantEntry.count} · Lv ${pull.newLevel}`;
    if (pull.leveledUp) text += ' · Level up!';
    if (pull.isSpecialVariant) text += ' · Rare edition!';
    meta.textContent = text;
    content.appendChild(meta);
  }

  card.appendChild(content);
  resultContainer.appendChild(card);
}

function renderVariantRates() {
  const foil = document.getElementById('rate-foil');
  const gold = document.getElementById('rate-gold');
  const poly = document.getElementById('rate-polychrome');
  if (foil) foil.value = variantRates.foil;
  if (gold) gold.value = variantRates.gold;
  if (poly) poly.value = variantRates.polychrome;
}

function saveVariantRatesFromForm() {
  variantRates = {
    foil: Math.max(0, parseFloat(document.getElementById('rate-foil')?.value) || 0),
    gold: Math.max(0, parseFloat(document.getElementById('rate-gold')?.value) || 0),
    polychrome: Math.max(0, parseFloat(document.getElementById('rate-polychrome')?.value) || 0),
  };
  AttaboyAccounts.saveVariantRates(variantRates);
  renderVariantRates();
}

/**
 * Read rarity weights from input fields, validate them, and save. If any
 * invalid or negative values are provided, they are clamped to zero. The
 * updated weights are saved to localStorage and applied to in-memory state.
 */
function saveWeights() {
  const newWeights = {};
  Object.keys(rarityWeights).forEach(rarity => {
    const val = parseInt(rarityInputs[rarity].value, 10);
    newWeights[rarity] = isNaN(val) || val < 0 ? 0 : val;
  });
  rarityWeights = newWeights;
  saveRarityWeights(rarityWeights);
  renderRarityWeights();
}

/**
 * Switch visible page by tab id. Updates tab buttons and panel visibility.
 * @param {string} tabId - 'home' | 'gacha' | 'admin'
 */
function switchTab(tabId) {
  const valid = ['home', 'gacha', 'collection', 'account', 'admin'];
  if (!valid.includes(tabId)) return;
  if (tabId === 'admin' && !isAdminUnlocked()) {
    openAdminLoginModal();
    return;
  }

  if (tabId === 'gacha' || tabId === 'collection') {
    refreshUserUI();
  }

  tabButtons.forEach(btn => {
    const isActive = btn.dataset.tab === tabId;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  Object.entries(pages).forEach(([id, panel]) => {
    if (!panel) return;
    const isActive = id === tabId;
    panel.classList.toggle('page-active', isActive);
    panel.hidden = !isActive;
  });
}

function setupTabNavigation() {
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  document.querySelectorAll('[data-goto]').forEach(el => {
    el.addEventListener('click', () => switchTab(el.dataset.goto));
  });
}

function setupAccountForms() {
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('register-username').value;
      const password = document.getElementById('register-password').value;
      const errEl = document.getElementById('register-error');
      const result = await AttaboyAccounts.registerUser(username, password);
      if (result.ok) {
        if (errEl) errEl.hidden = true;
        registerForm.reset();
        refreshUserUI();
        switchTab('gacha');
      } else if (errEl) {
        errEl.textContent = result.error;
        errEl.hidden = false;
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('login-username').value;
      const password = document.getElementById('login-password').value;
      const errEl = document.getElementById('account-login-error');
      const result = await AttaboyAccounts.loginUser(username, password);
      if (result.ok) {
        if (errEl) errEl.hidden = true;
        loginForm.reset();
        refreshUserUI();
        switchTab('gacha');
      } else if (errEl) {
        errEl.textContent = result.error;
        errEl.hidden = false;
      }
    });
  }

  if (userLogoutBtn) {
    userLogoutBtn.addEventListener('click', () => {
      AttaboyAccounts.logoutUser();
      refreshUserUI();
      switchTab('home');
    });
  }

  if (redeemForm) {
    redeemForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = AttaboyAccounts.getCurrentUser();
      const code = document.getElementById('redeem-code-input').value;
      const okEl = document.getElementById('redeem-success');
      const errEl = document.getElementById('redeem-error');
      const result = await AttaboyAccounts.redeemKeyCode(user?.username, code);
      if (result.ok) {
        if (okEl) {
          okEl.textContent = `Added ${result.keysAdded} key(s). You now have ${result.totalKeys}.`;
          okEl.hidden = false;
        }
        if (errEl) errEl.hidden = true;
        redeemForm.reset();
        refreshUserUI();
      } else if (errEl) {
        if (okEl) okEl.hidden = true;
        errEl.textContent = result.error;
        errEl.hidden = false;
      }
    });
  }

  if (grantKeysForm) {
    grantKeysForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const username = document.getElementById('grant-username').value;
      const amount = document.getElementById('grant-amount').value;
      const okEl = document.getElementById('grant-message');
      const errEl = document.getElementById('grant-error');
      const result = AttaboyAccounts.adminGrantKeys(username, amount);
      if (result.ok) {
        if (okEl) {
          okEl.textContent = `Granted ${result.granted} key(s) to ${result.user.username}.`;
          okEl.hidden = false;
        }
        if (errEl) errEl.hidden = true;
        grantKeysForm.reset();
        document.getElementById('grant-amount').value = '3';
        renderAdminUsersList();
        refreshUserUI();
      } else if (errEl) {
        if (okEl) okEl.hidden = true;
        errEl.textContent = result.error;
        errEl.hidden = false;
      }
    });
  }

  if (createCodeForm) {
    createCodeForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const keys = document.getElementById('code-keys').value;
      const created = AttaboyAccounts.generateRedeemCode(keys);
      const el = document.getElementById('code-created');
      if (el) {
        el.innerHTML = `New code: <code>${escapeHtml(created.code)}</code> (${created.keys} keys) — send this to the player, then <strong>Download codes file</strong> and push to GitHub.`;
        el.hidden = false;
      }
      renderRedeemCodesList();
    });
  }

  const downloadCodesBtn = document.getElementById('download-codes-btn');
  if (downloadCodesBtn) {
    downloadCodesBtn.addEventListener('click', () => {
      AttaboyAccounts.downloadRedeemCodesJson('redeem-codes.json');
    });
  }
}

function setupAdminAuth() {
  if (openAdminLoginBtn) {
    openAdminLoginBtn.addEventListener('click', openAdminLoginModal);
  }
  if (closeAdminLoginBtn) {
    closeAdminLoginBtn.addEventListener('click', closeAdminLoginModal);
  }
  if (cancelAdminLoginBtn) {
    cancelAdminLoginBtn.addEventListener('click', closeAdminLoginModal);
  }
  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleAdminLogin();
    });
  }
  if (adminLogoutBtn) {
    adminLogoutBtn.addEventListener('click', handleAdminLogout);
  }
  if (adminLoginDialog) {
    adminLoginDialog.addEventListener('cancel', (e) => {
      e.preventDefault();
      closeAdminLoginModal();
    });
  }
}

// Initialize the page
function init() {
  setupTabNavigation();
  setupAdminAuth();
  setupAccountForms();
  updateAdminAccess();
  refreshUserUI();
  switchTab('home');

  renderAttaboyList();
  renderRarityWeights();
  renderVariantRates();
  openBtn.addEventListener('click', openAttaboy);
  saveWeightsBtn.addEventListener('click', saveWeights);
  if (saveVariantRatesBtn) {
    saveVariantRatesBtn.addEventListener('click', saveVariantRatesFromForm);
  }
}

async function boot() {
  await AttaboyAccounts.loadPublishedRedeemCodes();
  init();
}

/**
 * Handle the admin login attempt. On success, reveal the Admin tab and panel.
 */
function handleAdminLogin() {
  const password = adminPasswordInput ? adminPasswordInput.value : '';
  if (password === ADMIN_PASSWORD) {
    setAdminUnlocked(true);
    if (adminPasswordInput) adminPasswordInput.value = '';
    if (loginErrorMsg) loginErrorMsg.hidden = true;
    closeAdminLoginModal();
    switchTab('admin');
    renderAdminUsersList();
    renderRedeemCodesList();
    renderVariantRates();
  } else {
    if (loginErrorMsg) loginErrorMsg.hidden = false;
  }
}

function handleAdminLogout() {
  setAdminUnlocked(false);
  closeAdminLoginModal();
  switchTab('home');
}

document.addEventListener('DOMContentLoaded', boot);
