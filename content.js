/**
 * Smart Link & URL Redirector - Content Script
 * Intercepts in-page link clicks directly at the DOM level and enforces page-level redirects
 */

(function () {
  let cachedRules = [];
  let cachedMasterEnabled = true;

  // Check if current page itself matches a redirect rule
  function checkCurrentPage() {
    if (!cachedMasterEnabled || !cachedRules.length) return;
    try {
      const currentUrl = window.location.href;
      const sim = simulateRedirect(currentUrl, cachedRules, cachedMasterEnabled);
      if (sim.redirected && sim.finalUrl && sim.finalUrl !== currentUrl) {
        console.log('[Redirector] Page matches redirect rule, redirecting to:', sim.finalUrl);
        window.location.replace(sim.finalUrl);
      }
    } catch (err) {
      // Ignore URL parsing errors
    }
  }

  // Initialize rules cache from storage
  async function loadConfig() {
    try {
      const data = await chrome.storage.local.get(['rules', 'isMasterEnabled']);
      if (data) {
        cachedRules = Array.isArray(data.rules) ? data.rules : [];
        cachedMasterEnabled = typeof data.isMasterEnabled === 'boolean' ? data.isMasterEnabled : true;
        checkCurrentPage();
      }
    } catch (e) {
      // Storage access error
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
      checkCurrentPage();
    }
  });

  // Intercept click & middle-click on links with capturing phase
  function handleLinkClick(e) {
    if (!cachedMasterEnabled || !cachedRules.length) return;

    const anchor = e.target.closest('a');
    if (!anchor) return;

    // Check original URL if it was rewritten on hover, or attribute href, or property href
    const checkUrl = anchor.dataset.originalHref || anchor.getAttribute('href') || anchor.href;
    if (!checkUrl) return;

    const sim = simulateRedirect(checkUrl, cachedRules, cachedMasterEnabled);
    if (sim.redirected && sim.finalUrl) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const isNewTab = e.ctrlKey || e.metaKey || e.button === 1 || anchor.target === '_blank';
      if (isNewTab) {
        window.open(sim.finalUrl, '_blank');
      } else {
        window.location.href = sim.finalUrl;
      }
    }
  }

  document.addEventListener('click', handleLinkClick, true);
  document.addEventListener('auxclick', handleLinkClick, true);

  // Preview rewrite on mouseover / hover so browser status bar shows target URL
  document.addEventListener('mouseover', (e) => {
    if (!cachedMasterEnabled || !cachedRules.length) return;

    const anchor = e.target.closest('a');
    if (!anchor) return;

    const checkUrl = anchor.dataset.originalHref || anchor.getAttribute('href') || anchor.href;
    if (!checkUrl || anchor.dataset.redirectChecked) return;
    anchor.dataset.redirectChecked = '1';

    const sim = simulateRedirect(checkUrl, cachedRules, cachedMasterEnabled);
    if (sim.redirected && sim.finalUrl && sim.finalUrl !== checkUrl) {
      anchor.dataset.originalHref = checkUrl;
      anchor.href = sim.finalUrl;
    }
  }, true);

  // Intercept Single Page App (SPA) in-page history navigations
  const originalPushState = history.pushState;
  history.pushState = function () {
    originalPushState.apply(this, arguments);
    checkCurrentPage();
  };

  const originalReplaceState = history.replaceState;
  history.replaceState = function () {
    originalReplaceState.apply(this, arguments);
    checkCurrentPage();
  };

  window.addEventListener('popstate', checkCurrentPage);
})();
