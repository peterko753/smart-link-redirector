/**
 * Smart Link & URL Redirector - Popup Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const masterToggle = document.getElementById('master-toggle');
  const statusSubtitle = document.getElementById('status-subtitle');
  const testInput = document.getElementById('test-input');
  const testBtn = document.getElementById('test-btn');
  const testResult = document.getElementById('test-result');
  const resultStatus = document.getElementById('result-status');
  const resultUrl = document.getElementById('result-url');
  const resultRule = document.getElementById('result-rule');

  const rulesList = document.getElementById('rules-list');
  const emptyState = document.getElementById('empty-state');
  const quickAddBtn = document.getElementById('quick-add-btn');
  const emptyAddBtn = document.getElementById('empty-add-btn');
  const quickAddPanel = document.getElementById('quick-add-panel');
  const newSourceInput = document.getElementById('new-source');
  const newTargetInput = document.getElementById('new-target');
  const saveQuickRuleBtn = document.getElementById('save-quick-rule-btn');
  const cancelQuickRuleBtn = document.getElementById('cancel-quick-rule-btn');
  const openOptionsBtn = document.getElementById('open-options-btn');

  // Load state
  let { rules = [], isMasterEnabled = true } = await chrome.storage.local.get(['rules', 'isMasterEnabled']);

  // Initial render
  masterToggle.checked = isMasterEnabled;
  renderRules();

  // Master switch handler
  masterToggle.addEventListener('change', async () => {
    isMasterEnabled = masterToggle.checked;
    await chrome.storage.local.set({ isMasterEnabled });
    await notifySync();
    renderRules();
  });

  // URL Tester handler
  testBtn.addEventListener('click', runTester);
  testInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') runTester();
  });

  function runTester() {
    const inputVal = testInput.value.trim();
    if (!inputVal) return;

    const simulation = simulateRedirect(inputVal, rules, isMasterEnabled);
    testResult.classList.remove('hidden');

    if (simulation.redirected) {
      resultStatus.textContent = 'Redirected';
      resultStatus.className = 'badge badge-success';
      resultUrl.textContent = simulation.finalUrl;
      resultRule.textContent = `Matched: "${simulation.matchedRule.name || 'Rule'}"`;
    } else {
      resultStatus.textContent = 'No Change';
      resultStatus.className = 'badge badge-neutral';
      resultUrl.textContent = simulation.finalUrl;
      resultRule.textContent = simulation.reason || 'No matching active rule';
    }
  }

  // Quick Add Toggle
  function toggleQuickAdd(show) {
    if (show) {
      quickAddPanel.classList.remove('hidden');
      newSourceInput.focus();
    } else {
      quickAddPanel.classList.add('hidden');
      newSourceInput.value = '';
      newTargetInput.value = '';
    }
  }

  quickAddBtn.addEventListener('click', () => {
    const isHidden = quickAddPanel.classList.contains('hidden');
    toggleQuickAdd(isHidden);
  });

  if (emptyAddBtn) {
    emptyAddBtn.addEventListener('click', () => toggleQuickAdd(true));
  }

  cancelQuickRuleBtn.addEventListener('click', () => toggleQuickAdd(false));

  saveQuickRuleBtn.addEventListener('click', async () => {
    const source = normalizeDomain(newSourceInput.value);
    const target = normalizeDomain(newTargetInput.value);

    if (!source || !target) {
      alert('Please enter both source and target domains.');
      return;
    }

    if (source === target) {
      alert('Target domain must be different from source domain.');
      return;
    }

    // Assign next unique numeric ID
    const nextNumericId = rules.reduce((max, r) => Math.max(max, r.numericId || 0), 0) + 1;

    const newRule = {
      id: `rule_${Date.now()}`,
      numericId: nextNumericId,
      name: `${source} → ${target}`,
      enabled: true,
      type: 'domain_swap',
      sourceHost: source,
      targetHost: target,
      created: Date.now()
    };

    rules.unshift(newRule);
    await chrome.storage.local.set({ rules });
    await notifySync();

    toggleQuickAdd(false);
    renderRules();
  });

  // Open Options page
  openOptionsBtn.addEventListener('click', () => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL('options/options.html'));
    }
  });

  // Render Rules
  function renderRules() {
    const activeCount = rules.filter(r => r.enabled).length;
    statusSubtitle.textContent = isMasterEnabled
      ? `Active Rules: ${activeCount} of ${rules.length}`
      : 'Redirects Disabled (Master Switch OFF)';

    rulesList.innerHTML = '';

    if (rules.length === 0) {
      emptyState.classList.remove('hidden');
      rulesList.classList.add('hidden');
      return;
    }

    emptyState.classList.add('hidden');
    rulesList.classList.remove('hidden');

    rules.forEach((rule, index) => {
      const item = document.createElement('div');
      item.className = `rule-item ${!rule.enabled || !isMasterEnabled ? 'disabled' : ''}`;

      // Left info
      const info = document.createElement('div');
      info.className = 'rule-info';

      const nameRow = document.createElement('div');
      nameRow.className = 'rule-name-row';

      const name = document.createElement('span');
      name.className = 'rule-name';
      name.textContent = rule.name || `Rule #${rule.numericId}`;

      const tag = document.createElement('span');
      tag.className = 'rule-type-tag';
      tag.textContent = rule.type === 'domain_swap' ? 'Domain' : (rule.type === 'exact' ? 'Exact' : 'Regex');

      nameRow.appendChild(name);
      nameRow.appendChild(tag);

      // Flow visual
      const flow = document.createElement('div');
      flow.className = 'rule-flow';

      let srcText = rule.sourceHost || rule.sourceUrl || rule.regexPattern;
      let tgtText = rule.targetHost || rule.targetUrl || rule.regexSubstitution;

      const srcSpan = document.createElement('span');
      srcSpan.className = 'rule-flow-source';
      srcSpan.textContent = srcText;
      srcSpan.title = srcText;

      const arrowSpan = document.createElement('span');
      arrowSpan.className = 'rule-flow-arrow';
      arrowSpan.textContent = '→';

      const tgtSpan = document.createElement('span');
      tgtSpan.className = 'rule-flow-target';
      tgtSpan.textContent = tgtText;
      tgtSpan.title = tgtText;

      flow.appendChild(srcSpan);
      flow.appendChild(arrowSpan);
      flow.appendChild(tgtSpan);

      info.appendChild(nameRow);
      info.appendChild(flow);

      // Right actions
      const actions = document.createElement('div');
      actions.className = 'rule-actions';

      const toggleLabel = document.createElement('label');
      toggleLabel.className = 'switch rule-toggle';
      toggleLabel.title = 'Enable / Disable rule';

      const toggleInput = document.createElement('input');
      toggleInput.type = 'checkbox';
      toggleInput.checked = rule.enabled;
      toggleInput.disabled = !isMasterEnabled;

      toggleInput.addEventListener('change', async () => {
        rules[index].enabled = toggleInput.checked;
        await chrome.storage.local.set({ rules });
        await notifySync();
        renderRules();
      });

      const slider = document.createElement('span');
      slider.className = 'slider round';

      toggleLabel.appendChild(toggleInput);
      toggleLabel.appendChild(slider);

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-icon';
      deleteBtn.title = 'Delete rule';
      deleteBtn.innerHTML = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';

      deleteBtn.addEventListener('click', async () => {
        rules.splice(index, 1);
        await chrome.storage.local.set({ rules });
        await notifySync();
        renderRules();
      });

      actions.appendChild(toggleLabel);
      actions.appendChild(deleteBtn);

      item.appendChild(info);
      item.appendChild(actions);

      rulesList.appendChild(item);
    });
  }

  // Notify background service worker to update DNR rules
  async function notifySync() {
    try {
      await chrome.runtime.sendMessage({ action: 'SYNC_RULES' });
    } catch (err) {
      console.warn('Background sync message failed:', err);
    }
  }
});
