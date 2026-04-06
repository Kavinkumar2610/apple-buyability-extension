const PRODUCTS = [
  {
    name: 'MacBook Air M5',
    partKey: 'RO_MBA_M5_13_INCH_SILVER_GOO_2026',
    url: 'https://www.apple.com/my-edu/shop/buyability-message' +
         '?parts.0=RO_MBA_M5_13_INCH_SILVER_GOO_2026' +
         '&option.0=065-CKGP%2C065-CLJ7%2C065-CK9N%2C065-CKDW%2C065-CKDV%2C065-CKDX%2C065-CK9T%2CZP065-CKGW%2C065-CK9H%2C065-CKDY' +
         '&store=R742'
  },
  {
    name: 'MacBook Pro M5 Pro',
    partKey: 'RO_MBP_M5PRO_M5MAX_14INCH_SILVER_BT_BS_UT_2026',
    url: 'https://www.apple.com/my-edu/shop/buyability-message' +
         '?parts.0=RO_MBP_M5PRO_M5MAX_14INCH_SILVER_BT_BS_UT_2026' +
         '&option.0=065-CL2T%2C065-CL15%2C065-CKX1%2C065-CL1N%2C065-CKYW%2C065-CKX7%2CZP065-CL30%2C065-CKWW%2C065-CKYT' +
         '&store=R742'
  },
  {
    name: 'MacBook Pro M5',
    partKey: 'MBP_2024_ROC_14_SILVER_EGB',
    url: 'https://www.apple.com/my-edu/shop/buyability-message' +
         '?parts.0=MBP_2024_ROC_14_SILVER_EGB' +
         '&option.0=065-CK56,065-CK57,065-CK5F,065-CK5H,065-CK5M,065-CK5P,065-CK66,065-CK77,ZP065-CK5Q' +
         '&store=R742'
  }
];

const ALARM_NAME = 'buyabilityCheck';
const DEFAULT_INTERVAL = 30;

async function getSettings() {
  const data = await chrome.storage.local.get({ autoRefreshEnabled: true, refreshIntervalMins: DEFAULT_INTERVAL });
  return data;
}

function updateBadge(state) {
  const MAP = {
    yes:     { text: 'YES', color: '#22c55e' },
    no:      { text: 'NO',  color: '#ef4444' },
    err:     { text: '!',   color: '#888888' },
    loading: { text: '...', color: '#3b82f6' },
  };
  const { text, color } = MAP[state] ?? MAP.err;
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
}

async function checkBuyability() {
  updateBadge('loading');
  try {
    const results = {};

    for (const product of PRODUCTS) {
      const res = await fetch(product.url, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      const msg = data?.body?.content?.buyabilityMessage;
      const sth = msg?.sth?.[product.partKey]?.isBuyable ?? null;
      const apu = msg?.apu?.[product.partKey]?.isBuyable ?? null;
      
      results[product.name] = { sth, apu };
    }

    // Green only if every product has at least STH or APU available
    const allAvailable = PRODUCTS.every(p => {
      const r = results[p.name];
      return r && (r.sth === true || r.apu === true);
    });

    await chrome.storage.local.set({ buyabilityResult: { products: results, lastChecked: new Date().toISOString(), error: null } });
    updateBadge(allAvailable ? 'yes' : 'no');
    
    const { prevAvailable } = await chrome.storage.local.get('prevAvailable');
    if (allAvailable && !prevAvailable) {
      chrome.action.setTitle({ title: 'MacBook is NOW AVAILABLE!' });
    } else {
      chrome.action.setTitle({ title: 'MacBook Availability Checker' });
    }
    await chrome.storage.local.set({ prevAvailable: allAvailable });
  } catch (err) {
    const result = { products: {}, lastChecked: new Date().toISOString(), error: err.message };
    await chrome.storage.local.set({ buyabilityResult: result });
    updateBadge('err');
  }
}

async function ensureAlarm() {
  const { autoRefreshEnabled, refreshIntervalMins } = await getSettings();
  if (!autoRefreshEnabled) { await chrome.alarms.clear(ALARM_NAME); return; }
  const existing = await chrome.alarms.get(ALARM_NAME);
  if (!existing) {
    chrome.alarms.create(ALARM_NAME, { periodInMinutes: refreshIntervalMins });
  }
}

async function resetAlarm() {
  await chrome.alarms.clear(ALARM_NAME);
  const { autoRefreshEnabled, refreshIntervalMins } = await getSettings();
  if (autoRefreshEnabled) {
    await chrome.alarms.create(ALARM_NAME, { periodInMinutes: refreshIntervalMins });
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  await ensureAlarm();
  checkBuyability();
});

chrome.runtime.onStartup.addListener(async () => {
  await ensureAlarm();
  const { buyabilityResult } = await chrome.storage.local.get('buyabilityResult');
  if (buyabilityResult) {
    if (buyabilityResult.error) {
      updateBadge('err');
    } else {
      // Green only if every product has at least STH or APU available
      const allAvailable = PRODUCTS.every(p => {
        const r = (buyabilityResult.products || {})[p.name];
        return r && (r.sth === true || r.apu === true);
      });
      updateBadge(allAvailable ? 'yes' : 'no');
    }
 }
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) checkBuyability();
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === 'refresh') {
    checkBuyability().then(async () => {
      await resetAlarm();
      sendResponse({ ok: true });
    });
    return true;
  }
  if (msg.action === 'resetAlarm') {
    resetAlarm().then(() => sendResponse({ ok: true }));
    return true;
  }
});
