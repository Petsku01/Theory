// Not fully tested version.
// -pk

let cleanedCount = 0;
let enabled = true;

browser.storage.local.get(["cleanedCount", "enabled"], (data) => {
  cleanedCount = data.cleanedCount || 0;
  enabled = data.enabled !== false; // Default true
});

// Comprehensive list of tracking parameters (2025 updated, inspired by ClearURLs/Firefox/uBlock)
const TRACKING_PARAMS = [
  "fbclid", "gclid", "msclkid", "mc_eid", "zanpid", "utm_source", "utm_medium",
  "utm_campaign", "utm_term", "utm_content", "ref", "_ga", "icid", "oclid",
  "vero_conv", "vero_id", "dclid", "mlt", "pk_*", "ttclid", "li_fat_id",
  "_gl", "_hsmi", "_ke", "_kx", "_paged", "_sm_byp", "_sp", "_szp", "3x",
  "a", "a_k", "ac", "acpage", "action_object_map", "action_ref_map",
  "action_type_map", "activecampaign_id", "ad", "ad_frame_full", "ad_name",
  "adclida", "adid", "adlt", "adsafe_ip", "adset_name", "advid", "aff_sub2",
  "afftrack", "ak_action", "alt_id", "am", "amp;utm_*", "camp", "campaign_id",
  "cid", "cmpid", "dsource", "epik", "gbraid", "hmb_campaign", "hmb_medium",
  "hmb_source", "igshid", "mkwid", "matomo_*", "mc_cid", "mc_eid", "mkcid",
  "mkevt", "mkrid", "mkt_tok", "ml_subscriber", "ml_subscriber_hash",
  "msclkid", "ns_fee", "pcrid", "piwik_*", "pk_campaign", "pk_kwd",
  "redirect", "sb_referrer_host", "si", "s_cid", "twclid", "wbraid", "ysclid"
];

// Basic known tracking/fingerprinting domains (recommend uBlock EasyPrivacy for full lists)
const BLOCKED_DOMAINS = [
  "google-analytics.com", "googletagmanager.com", "doubleclick.net",
  "adservice.google.com", "connect.facebook.net", "px.ads.linkedin.com",
  "analytics.twitter.com", "static.hotjar.com", "script.hotjar.com",
  "ads.yahoo.com", "pixel.quora.com"
];

// Send Global Privacy Control header (Sec-GPC: 1)
browser.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    if (!enabled) return;
    const headers = details.requestHeaders;
    headers.push({ name: "Sec-GPC", value: "1" });
    return { requestHeaders: headers };
  },
  { urls: ["<all_urls>"] },
  ["blocking", "requestHeaders"]
);

// Block known tracking domains
browser.webRequest.onBeforeRequest.addListener(
  () => ({ cancel: true }),
  { urls: BLOCKED_DOMAINS.map(d => `*://*.${d}/*`) },
  ["blocking"]
);

// Strip tracking parameters from ALL requests
browser.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (!enabled || details.method !== "GET") return;
    try {
      const url = new URL(details.url);
      let changed = false;
      url.searchParams.forEach((value, key) => {
        const lowerKey = key.toLowerCase();
        if (TRACKING_PARAMS.some(param => 
          lowerKey === param.replace("*", "") || 
          (param.includes("*") && lowerKey.startsWith(param.replace("*", "")))
        )) {
          url.searchParams.delete(key);
          changed = true;
        }
      });
      if (changed) {
        cleanedCount++;
        browser.storage.local.set({ cleanedCount });
        return { redirectUrl: url.toString() };
      }
    } catch (e) {
      console.error("Privacy Plus error:", e);
    }
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);

// For popup communication
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getStats") {
    sendResponse({ cleanedCount, enabled });
  } else if (message.action === "toggle") {
    enabled = !enabled;
    browser.storage.local.set({ enabled });
    sendResponse({ enabled });
  }
});
