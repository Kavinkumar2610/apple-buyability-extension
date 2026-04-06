# Apple MacBook Availability Checker

A Chrome extension that monitors the **Apple MY-EDU Store** (Apple The Exchange TRX, Malaysia) for MacBook availability in real time — right from your browser toolbar.

---

## Features

- **Live badge indicator** — shows `YES` (green), `NO` (red), or `!` (error) directly on the extension icon
- **3 products tracked simultaneously:**
  - MacBook Air M5 (13-inch, Silver)
  - MacBook Pro M5 Pro (14-inch, Silver)
  - MacBook Pro M5 (14-inch, Silver)
- **Ship to Home (STH)** and **Store Pick-Up (APU)** availability shown per product
- **Green badge only when all 3 are available** (at least STH or APU)
- **Auto-refresh** with a configurable interval (5, 10, 15, 30 min, or 1 hr)
- **Toggle auto-refresh** on or off from the popup
- **Manual refresh** button with a loading spinner
- **Last checked** time and next check countdown in the footer
- Persists settings and last result across browser restarts

---

## Screenshots

<img width="355" height="576" alt="image" src="https://github.com/user-attachments/assets/2cdf88b0-4875-40f3-98f6-7269afbff645" />


---

## Installation

This extension is not published to the Chrome Web Store. Install it as an unpacked extension:

1. Clone or download this repository:
   ```bash
   git clone https://github.com/Kavinkumar2610/apple-buyability-extension.git
   ```
2. Open Chrome and navigate to `chrome://extensions`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked**
5. Select the `apple-buyability-extension` folder
6. The extension icon will appear in your toolbar

---

## Usage

- Click the **extension icon** to open the popup
- Each product shows two cards: **Ship to Home** and **Store Pick-Up**
- Use the **Refresh** button to check availability immediately
- Use the **Auto-refresh toggle** to enable or disable background polling
- Use the **interval dropdown** to set how often the check runs (5 min – 1 hr)
- Clicking the **Apple logo** opens the Apple MY-EDU store in a new tab

### Badge meanings

| Badge | Colour | Meaning |
|-------|--------|---------|
| `YES` | 🟢 Green | All 3 MacBooks available (at least STH or APU) |
| `NO` | 🔴 Red | One or more MacBooks unavailable |
| `...` | 🔵 Blue | Check in progress |
| `!` | ⚫ Grey | Network or API error |

---

## How It Works

- Uses the `chrome.alarms` API to schedule periodic background checks without keeping the service worker alive continuously
- Fetches Apple's internal `buyability-message` endpoint for the MY-EDU store (store code `R742`)
- Checks `isBuyable` for both `sth` (Ship to Home) and `apu` (In-Store Pick-Up) fulfilment channels
- Results are cached in `chrome.storage.local` and displayed instantly when the popup opens
- Settings (`autoRefreshEnabled`, `refreshIntervalMins`) persist across sessions

---

## Project Structure

```
apple-buyability-extension/
├── manifest.json       # Extension manifest (MV3)
├── background.js       # Service worker — polling, alarms, badge updates
├── popup.html          # Popup UI layout and styles
├── popup.js            # Popup logic — rendering, settings, timer
└── icons/
    └── apple-logo.png  # Extension icon
```

---

## Permissions

| Permission | Reason |
|------------|--------|
| `alarms` | Schedule periodic availability checks |
| `storage` | Persist results and settings locally |
| `host_permissions: https://www.apple.com/*` | Fetch the buyability API |

---

## Disclaimer

This extension is a personal tool and is **not affiliated with, endorsed by, or associated with Apple Inc.** in any way. It reads publicly accessible data from Apple's website solely for personal notification purposes.
