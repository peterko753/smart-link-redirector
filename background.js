/**
 * Smart Link & URL Redirector - Background Service Worker
 * Manifest V3 compliant
 */

importScripts('rules-engine.js');

// Synchronize declarativeNetRequest dynamic rules with extension storage
async function syncDnrRules() {
  try {
    let { rules = [], isMasterEnabled = true } = await chrome.storage.local.get(['rules', 'isMasterEnabled']);
    
    // Auto-clean default twitter->nitter sample rule if still present in storage
    const cleanedRules = rules.filter(r => r.id !== 'rule_default_2' && !(r.sourceHost === 'twitter.com' && r.targetHost === 'nitter.net'));
    if (cleanedRules.length !== rules.length) {
      rules = cleanedRules;
      await chrome.storage.local.set({ rules });
    }

    // Get currently active dynamic rule IDs to remove them
    const existingDynamicRules = await chrome.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existingDynamicRules.map(rule => rule.id);

    // Compile new DNR rules from user configuration
    const addRules = compileDnrRules(rules, isMasterEnabled);

    // Update dynamic rules atomically
    await chrome.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules
    });

    console.log('[Redirector] Dynamic DNR rules updated:', addRules.length, 'active rules');

    // Update badge visual status
    await updateBadge(rules, isMasterEnabled);
    return { success: true, activeRulesCount: addRules.length };
  } catch (error) {
    console.error('[Redirector] Error synchronizing declarativeNetRequest rules:', error);
    return { success: false, error: error.message };
  }
}

// Fallback & Omnibox / Service Worker Navigation Interceptor via webNavigation
if (chrome.webNavigation && chrome.webNavigation.onBeforeNavigate) {
  chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
    // Only intercept top-level main frame navigations
    if (details.frameId !== 0) return;

    try {
      const { rules = [], isMasterEnabled = true } = await chrome.storage.local.get(['rules', 'isMasterEnabled']);
      if (!isMasterEnabled || !rules.length) return;

      const sim = simulateRedirect(details.url, rules, isMasterEnabled);
      if (sim.redirected && sim.finalUrl && sim.finalUrl !== details.url) {
        console.log('[Redirector] webNavigation redirecting:', details.url, '➔', sim.finalUrl);
        await chrome.tabs.update(details.tabId, { url: sim.finalUrl });
      }
    } catch (err) {
      console.warn('[Redirector] webNavigation error:', err);
    }
  });
}

// Debug rule matches when available
if (chrome.declarativeNetRequest && chrome.declarativeNetRequest.onRuleMatchedDebug) {
  chrome.declarativeNetRequest.onRuleMatchedDebug.addListener((info) => {
    console.log('[Redirector] DNR Rule Matched:', info.request.url, 'Rule ID:', info.rule.ruleId);
  });
}

// Update extension icon badge
async function updateBadge(rules, isMasterEnabled) {
  try {
    if (!isMasterEnabled) {
      await chrome.action.setBadgeText({ text: 'OFF' });
      await chrome.action.setBadgeBackgroundColor({ color: '#E53E3E' }); // Red
      return;
    }

    const activeCount = rules.filter(r => r.enabled).length;
    if (activeCount > 0) {
      await chrome.action.setBadgeText({ text: String(activeCount) });
      await chrome.action.setBadgeBackgroundColor({ color: '#00C4CC' }); // Vibrant Cyan
    } else {
      await chrome.action.setBadgeText({ text: '' });
    }
  } catch (err) {
    console.warn('Failed to update extension badge:', err);
  }
}

// Initialize default storage on first install
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    const initialConfig = {
      isMasterEnabled: true,
      rules: [
        {
          id: 'rule_default_1',
          numericId: 1,
          name: 'Domain Swap Example (Preserves /path)',
          enabled: false,
          type: 'domain_swap',
          sourceHost: 'originaldomain.com',
          targetHost: 'newdomain.com',
          created: Date.now()
        }
      ]
    };
    await chrome.storage.local.set(initialConfig);
  }
  await syncDnrRules();
});

// Resync rules on browser startup
chrome.runtime.onStartup.addListener(async () => {
  await syncDnrRules();
});

// Handle messages from Popup and Options page
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message.action === 'SYNC_RULES') {
        const result = await syncDnrRules();
        sendResponse(result);
      } else if (message.action === 'SIMULATE_REDIRECT') {
        const { rules = [], isMasterEnabled = true } = await chrome.storage.local.get(['rules', 'isMasterEnabled']);
        const result = simulateRedirect(message.url, rules, isMasterEnabled);
        sendResponse(result);
      } else {
        sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
  })();
  return true; // Keep message channel open for async response
});
