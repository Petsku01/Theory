# Privacy Plus - README 2025

## Overview

**Privacy Plus** is a lightweight, open-source WebExtension designed specifically for Waterfox (and compatible with Firefox) to enhance your browsing privacy. It focuses on practical, effective protections without unnecessary complexity or telemetry.

### Key Features
- **Strips tracking parameters** from URLs (e.g., `fbclid`, `gclid`, `utm_*`, and 80+ others) across all requests — prevents cross-site tracking via referral links.
- **Blocks a core set of known tracking/fingerprinting domains** (e.g., Google Analytics, Facebook Pixel, Hotjar).
- **Simple popup interface** with:
  - Real-time counter of cleaned URLs
  - Toggle to enable/disable the extension instantly
- **No telemetry, no data collection** — runs entirely locallly.

This extension complements (not replaces) tools like **uBlock Origin** (recommended with EasyPrivacy lists for comprehensive blocking).

## Installation

### For Testing / Personal Use (Waterfox & Firefox)
1. Download or create a folder named `privacy-plus`.
2. Save the following files inside it:
   - `manifest.json`
   - `background.js`
   - `popup.html`
   - `popup.js`
   - (Optional) `icon.png` (48x48 or 96x96 PNG — any shield/lock icon works)
3. Open Waterfox and go to:  
   `about:debugging#/runtime/this-firefox`
4. Click **"Load Temporary Add-on..."**
5. Select any file inside the `privacy-plus` folder (e.g., `manifest.json`).
6. The extension loads immediately and appears in your toolbar.

> Note: Temporary add-ons are removed on browser restart. For permanent installation, zip the folder and rename to `.xpi`, then drag into Waterfox or install via `about:addons`.

### Permanent Installation (Optional)
- Zip the folder contents (not the folder itself):  
  `privacy-plus.zip` → rename to `privacy-plus.xpi`
- In Waterfox: Open `about:addons` → Click the gear icon → "Install Add-on From File" → select the `.xpi`

Waterfox allows unsigned extensions by default — no Mozilla review needed.

## Usage
- Click the **Privacy Plus** toolbar icon to open the popup.
- View how many tracking URLs have been cleaned.
- Toggle the extension on/off without disabling it completely.
- Works silently in the background on all sites.

## Recommendations for Maximum Privacy
- Enable **uBlock Origin** with EasyPrivacy and other filter lists.
- Use Waterfox's **Strict** enhanced tracking protection.
- Enable **HTTPS-Only Mode** in Waterfox settings.
- For advanced anti-fingerprinting, consider LibreWolf or extensions like CanvasBlocker.

## Limitations
- Tracking parameter list is comprehensive but not exhaustive — trackers evolve.
- Domain blocking is basic by design (to stay lightweight).
- Does not spoof fingerprinting (e.g., canvas, fonts) — use dedicated tools for that.

## Contributing & Updates
This is a simple, user-focused extension. Feel free to:
- Expand the `TRACKING_PARAMS` list in `background.js`.
- Add more domains to `BLOCKED_DOMAINS`.
- Submit improvements or report issues.



// -pk
