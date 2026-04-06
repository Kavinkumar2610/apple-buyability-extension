function fmtTime(iso) {
  if (!iso) return 'Never';
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
         ' · ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function applyStatus(valueEl, hintEl, value, label) {
  if (value === true) {
    valueEl.textContent = 'YES'; valueEl.className = 'card-value yes';
    hintEl.textContent = label + ' · Available';
  } else if (value === false) {
    valueEl.textContent = 'NO'; valueEl.className = 'card-value no';
    hintEl.textContent = label + ' · Unavailable';
  } else {
    valueEl.textContent = '—'; valueEl.className = 'card-value unknown';
    hintEl.textContent = label;
  }
}

async function refresh() {
  const { buyabilityResult } = await chrome.storage.local.get('buyabilityResult');
  const errorBanner = document.getElementById('error-banner');
  const container = document.getElementById('products-container');

  if (!buyabilityResult) {
    document.getElementById('last-checked').textContent = 'Checking for the first time...';
    return;
  }

  container.innerHTML = '';

  if (buyabilityResult.error) {
    errorBanner.textContent = 'Error: ' + buyabilityResult.error;
    errorBanner.style.display = 'block';
    return;
  } else {
    errorBanner.style.display = 'none';
  }

  const products = buyabilityResult.products || {};
  for (const [productName, data] of Object.entries(products)) {
    const productDiv = document.createElement('div');
    productDiv.className = 'product';

    const titleDiv = document.createElement('div');
    titleDiv.className = 'product-title';
    titleDiv.textContent = productName;
    productDiv.appendChild(titleDiv);

    const cardsDiv = document.createElement('div');
    cardsDiv.className = 'cards';

    const sthCard = document.createElement('div');
    sthCard.className = 'card';
    sthCard.innerHTML = `
      <div class="card-label">Ship to Home</div>
      <div class="card-value unknown">—</div>
      <div class="card-hint">STH</div>
    `;
    
    const apuCard = document.createElement('div');
    apuCard.className = 'card';
    apuCard.innerHTML = `
      <div class="card-label">Store Pick-Up</div>
      <div class="card-value unknown">—</div>
      <div class="card-hint">APU</div>
    `;

    applyStatus(sthCard.querySelector('.card-value'), sthCard.querySelector('.card-hint'), data.sth, 'STH');
    applyStatus(apuCard.querySelector('.card-value'), apuCard.querySelector('.card-hint'), data.apu, 'APU');

    cardsDiv.appendChild(sthCard);
    cardsDiv.appendChild(apuCard);
    productDiv.appendChild(cardsDiv);
    container.appendChild(productDiv);
  }

  document.getElementById('last-checked').textContent = 'Checked: ' + fmtTime(buyabilityResult.lastChecked);
}

async function refreshNextCheckTimer() {
  const el = document.getElementById('next-check');
  const { autoRefreshEnabled } = await chrome.storage.local.get({ autoRefreshEnabled: true });
  if (!autoRefreshEnabled) {
    el.textContent = 'Auto-refresh off';
    return;
  }
  const alarm = await chrome.alarms.get('buyabilityCheck');
  if (alarm) {
    const ms   = alarm.scheduledTime - Date.now();
    const mins = Math.max(0, Math.ceil(ms / 60000));
    el.textContent = 'Next check in ' + mins + ' min' + (mins !== 1 ? 's' : '');
  } else {
    el.textContent = '';
  }
}

document.getElementById('btn-refresh').addEventListener('click', () => {
  const btn = document.getElementById('btn-refresh');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Checking...';
  chrome.runtime.sendMessage({ action: 'refresh' }, () => {
    refresh();
    refreshNextCheckTimer();
    btn.disabled = false;
    btn.textContent = 'Refresh';
  });
});

refresh();
refreshNextCheckTimer();

async function loadSettings() {
  const { autoRefreshEnabled, refreshIntervalMins } = await chrome.storage.local.get({
    autoRefreshEnabled: true,
    refreshIntervalMins: 30
  });
  const toggle = document.getElementById('toggle-auto-refresh');
  const select = document.getElementById('interval-select');
  toggle.checked = autoRefreshEnabled;
  select.value = String(refreshIntervalMins);
  select.disabled = !autoRefreshEnabled;
}

document.getElementById('toggle-auto-refresh').addEventListener('change', async (e) => {
  const enabled = e.target.checked;
  const select = document.getElementById('interval-select');
  select.disabled = !enabled;
  await chrome.storage.local.set({ autoRefreshEnabled: enabled });
  await chrome.alarms.clear('buyabilityCheck');
  if (enabled) {
    const mins = parseInt(select.value, 10);
    await chrome.alarms.create('buyabilityCheck', { periodInMinutes: mins });
  }
  refreshNextCheckTimer();
});

document.getElementById('interval-select').addEventListener('change', async (e) => {
  const mins = parseInt(e.target.value, 10);
  await chrome.storage.local.set({ refreshIntervalMins: mins });
  await chrome.alarms.clear('buyabilityCheck');
  await chrome.alarms.create('buyabilityCheck', { periodInMinutes: mins });
  refreshNextCheckTimer();
});

loadSettings();
