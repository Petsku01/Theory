function updateDisplay() {
  browser.runtime.sendMessage({ action: "getStats" }).then((stats) => {
    document.getElementById("count").textContent = stats.blockedCount;
    document.getElementById("domains").textContent = stats.domainCount;
    document.getElementById("status").textContent = stats.enabled ? "Enabled" : "Disabled";
  });
}

updateDisplay();

document.getElementById("toggle").addEventListener("click", () => {
  browser.runtime.sendMessage({ action: "toggle" }).then(() => updateDisplay());
});

document.getElementById("update").addEventListener("click", () => {
  browser.runtime.sendMessage({ action: "forceUpdate" });
  alert("Updating blocklists in background...");
});
