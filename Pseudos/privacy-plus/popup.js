browser.runtime.sendMessage({ action: "getStats" }).then((stats) => {
  document.getElementById("count").textContent = stats.cleanedCount;
  document.getElementById("status").textContent = stats.enabled ? "Enabled" : "Disabled";
});

document.getElementById("toggle").addEventListener("click", () => {
  browser.runtime.sendMessage({ action: "toggle" }).then((stats) => {
    document.getElementById("status").textContent = stats.enabled ? "Enabled" : "Disabled";
  });
});
