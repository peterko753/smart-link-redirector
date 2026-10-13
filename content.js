/**
 * Smart Link & URL Redirector - Content Script
 * Intercepts in-page link clicks directly at the DOM level
 */

(function () {
  let cachedRules = [];
  let cachedMasterEnabled = true;

  // Initialize rules cache from storage
  async function loadConfig() {
    try {
      const data = await chrome.storage.local.get(['rules', 'isMasterEnabled']);
      if (data) {
        cachedRules = Array.isArray(data.rules) ? data.rules : [];
        cachedMasterEnabled = typeof data.isMasterEnabled === 'boolean' ? data.isMasterEnabled : true;
      }
    } catch (e) {
      // Storage access error or extension context invalidated
    }
  }

  loadConfig();

  // Keep cache synced when user updates rules in popup/options
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
      if (changes.rules) {
        cachedRules = changes.rules.newValue || [];
      }
      if (changes.isMasterEnabled) {
        cachedMasterEnabled = changes.isMasterEnabled.newValue;
      }
    }
  });

  // Intercept click on links
  document.addEventListener('click', (e) => {
    if (!cachedMasterEnabled || !cachedRules.length) return;

    const anchor = e.target.closest('a');
    if (!anchor || !anchor.href) return;

    // Check if the link URL matches any redirect rule
    const sim = simulateRedirect(anchor.href, cachedRules, cachedMasterEnabled);
    if (sim.redirected && sim.finalUrl && sim.finalUrl !== anchor.href) {
      e.preventDefault();
      e.stopPropagation();

      // Check if user clicked to open in a new tab
      const isNewTab = e.ctrlKey || e.metaKey || e.button === 1 || anchor.target === '_blank';
      if (isNewTab) {
        window.open(sim.finalUrl, '_blank');
      } else {
        window.location.href = sim.finalUrl;
      }
    }
  }, true);

  // Preview rewrite on mouseover / hover so browser status bar shows target URL
  document.addEventListener('mouseover', (e) => {
    if (!cachedMasterEnabled || !cachedRules.length) return;

    const anchor = e.target.closest('a');
    if (!anchor || !anchor.href || anchor.dataset.redirectChecked) return;
    anchor.dataset.redirectChecked = '1';

    const sim = simulateRedirect(anchor.href, cachedRules, cachedMasterEnabled);
    if (sim.redirected && sim.finalUrl && sim.finalUrl !== anchor.href) {
      anchor.href = sim.finalUrl;
    }
  }, true);
})();
