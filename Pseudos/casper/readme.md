# Casper - README

## Overview

**Casper** is a test version lightweight, high-performance, privacy-focused WebExtension for Waterfox (and compatible with Firefox) that aggressively blocks ads, trackers, malware, and unwanted domains at the network level.


### Key Features
- **Blocks millions of known bad domains** using the respected StevenBlack unified hosts lists (covering ads, tracking, malware, fakenews, and optional gambling/porn).
- **Fast domain lookup** with a Set-based system — minimal CPU and memory impact.
- **Automatic daily updates** of blocklists in the background.
- **Sends Global Privacy Control (GPC)** signal (`Sec-GPC: 1`) on every request — legally enforceable opt-out from data sales in several U.S. states (CA, CO, CT, NJ as of December 2025).
- **Simple popup interface** showing:
  - Total blocked requests
  - Number of domains currently blocked
  - Enable/disable toggle
  - Manual "Force Update Lists" button
- **Zero telemetry** — runs entirely locally, no data collection.

Casper is designed to complement other privacy tools (e.g., uBlock Origin for cosmetic filtering and scriptlets) or work standalone as a powerful network-level blocker.

## Installation

### For Testing / Personal Use
1. Create a folder named `casper`.
2. Save the following files inside it:
   - `manifest.json`
   - `background.js`
   - `popup.html`
   - `popup.js`
   - (Optional) `icon.png` (48x48 and/or 96x96 PNG — a ghost or shield icon works great)
3. Open Waterfox and navigate to:  
   `about:debugging#/runtime/this-firefox`
4. Click **"Load Temporary Add-on..."**
5. Select any file inside the `casper` folder (e.g., `manifest.json`).
6. Casper will load immediately and appear in your toolbar.

> Temporary add-ons are removed on browser restart.

### Permanent Installation
1. Zip the contents of the `casper` folder (not the folder itself) into `casper.zip`.
2. Rename the file to `casper.xpi`.
3. In Waterfox: Go to `about:addons` → Click the gear icon → "Install Add-on From File..." → select `casper.xpi`.

Waterfox allows unsigned extensions by default — no signing or review required.

## Usage
- Click the **Casper** toolbar icon to open the popup.
- View real-time stats (blocked requests and loaded domains).
- Toggle the extension on/off instantly.
- Click **"Force Update Lists"** to refresh blocklists manually (useful after installation or if you suspect changes).

Casper works silently on all sites. The first load after installation may take a few seconds while it downloads and processes the blocklists.

## Recommendations for Maximum Privacy
- Pair with **uBlock Origin** (for cosmetic filters, cookie banner hiding, and advanced scriptlet blocking).
- Enable Waterfox's **Strict** mode in Enhanced Tracking Protection.
- Turn on **HTTPS-Only Mode** in Waterfox settings.
- Consider the companion **Privacy Plus** extension for aggressive tracking parameter stripping from URLs.

## Limitations
- Blocks at the domain level only — does not handle cosmetic hiding or advanced anti-adblock bypassing (use uBlock Origin for those).
- Initial blocklist download may take 10–30 seconds depending on your connection.
- Extremely aggressive lists can occasionally block legitimate content (toggle off temporarily if needed).

## Customizing
The extension is easy to modify:
- Edit `BLOCKLIST_URLS` in `background.js` to add/remove StevenBlack variants or other hosts files.
- Adjust the update interval by changing `periodInMinutes: 1440` (currently 24 hours).


// -pk
