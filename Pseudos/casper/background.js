let blockedCount = 0;
let enabled = true;
let blockedDomains = new Set(); // Fast lookup

// Curated blocklist sources (StevenBlack hosts - unified, high-quality, updated daily)
// Best and big
const BLOCKLIST_URLS = [
  "https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts", // Unified hosts (ads, tracking, malware, fakenews)
  "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/fakenews-gambling-porn/hosts" // Optional: extra strict
];

async function updateBlocklist() {
  let newDomains = new Set();
  for (const url of BLOCKLIST_URLS) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) continue;
      const text = await response.text();
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.startsWith('0.0.0.0 ') || line.startsWith('127.0.0.1 ')) {
          const domain = line.split(/\s+/)[1].trim().toLowerCase();
          if (domain && !domain.startsWith('#') && !domain.includes('localhost')) {
            newDomains.add(domain);
          }
        }
      }
    } catch (e) {
      console.error("Casper: Failed to fetch blocklist", url, e);
    }
  }

  if (newDomains.size > 10000) { // Sanity check (for this, not me)
    blockedDomains = newDomains;
    await browser.storage.local.set({ 
      blockedDomains: Array.from(blockedDomains),
      lastUpdate: Date.now()
    });
    console.log(`Casper: Updated blocklist with ${blockedDomains.size} domains`);
  }
}

// Load from storage on startup
async function loadCachedBlocklist() {
  const data = await browser.storage.local.get(["blockedDomains", "blockedCount", "enabled", "lastUpdate"]);
  if (data.blockedDomains) {
    blockedDomains = new Set(data.blockedDomains);
  }
  blockedCount = data.blockedCount || 0;
  enabled = data.enabled !== false;
  
  // Update if older than 24 hours
  const dayOld = 24 * 60 * 60 * 1000;
  if (!data.lastUpdate || Date.now() - data.lastUpdate > dayOld) {
    updateBlocklist();
  }
}

// Blocking listener - very fast Set lookup
browser.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (!enabled) return;
    try {
      const urlObj = new URL(details.url);
      const hostname = urlObj.hostname.toLowerCase();

      if (blockedDomains.has(hostname) || blockedDomains.has('www.' + hostname)) {
        blockedCount++;
        browser.storage.local.set({ blockedCount });
        return { cancel: true };
      }
    } catch (e) {
      // Invalid URL - ignore
    }
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);

// Sec-GPC header
browser.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    if (!enabled) return;
    details.requestHeaders.push({ name: "Sec-GPC", value: "1" });
    return { requestHeaders: details.requestHeaders };
  },
  { urls: ["<all_urls>"] },
  ["blocking", "requestHeaders"]
);

// Periodic update (every 24 hours)
browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "updateBlocklist") {
    updateBlocklist();
  }
});
browser.alarms.create("updateBlocklist", { delayInMinutes: 60, periodInMinutes: 1440 });

// Startup
browser.runtime.onInstalled.addListener(() => {
  loadCachedBlocklist();
  updateBlocklist();
});
browser.runtime.onStartup.addListener(loadCachedBlocklist);
loadCachedBlocklist();

// Popup communication
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getStats") {
    sendResponse({ 
      blockedCount, 
      enabled,
      domainCount: blockedDomains.size
    });
  } else if (message.action === "toggle") {
    enabled = !enabled;
    browser.storage.local.set({ enabled });
    sendResponse({ enabled });
  } else if (message.action === "forceUpdate") {
    updateBlocklist();
    sendResponse({ updating: true });
  }
  return true; // Async response
});
