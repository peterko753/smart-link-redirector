/**
 * Smart Link & URL Redirector - Options Dashboard Controller
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const masterToggle = document.getElementById('master-toggle');
  const engineBadge = document.getElementById('engine-status-badge');
  const metricTotal = document.getElementById('metric-total-rules');
  const metricActive = document.getElementById('metric-active-rules');

  // Sandbox elements
  const sandboxInput = document.getElementById('sandbox-input');
  const sandboxTestBtn = document.getElementById('sandbox-test-btn');
  const sandboxOutput = document.getElementById('sandbox-output');
  const simInputUrl = document.getElementById('sim-input-url');
  const simMatchedRule = document.getElementById('sim-matched-rule');
  const simOutputUrl = document.getElementById('sim-output-url');
  const simOpenLink = document.getElementById('sim-open-link');

  // Form elements
  const ruleForm = document.getElementById('rule-form');
  const formCardTitle = document.getElementById('form-card-title');
  const cancelEditBtn = document.getElementById('cancel-edit-btn');
  const editRuleId = document.getElementById('edit-rule-id');
  const ruleName = document.getElementById('rule-name');
  const typeButtons = document.querySelectorAll('.type-btn');

  const fieldsDomainSwap = document.getElementById('fields-domain-swap');
  const fieldsExact = document.getElementById('fields-exact');
  const fieldsRegex = document.getElementById('fields-regex');

  const fieldSourceDomain = document.getElementById('field-source-domain');
  const fieldTargetDomain = document.getElementById('field-target-domain');
  const fieldSourceUrl = document.getElementById('field-source-url');
  const fieldTargetUrl = document.getElementById('field-target-url');
  const fieldRegexPattern = document.getElementById('field-regex-pattern');
  const fieldRegexSub = document.getElementById('field-regex-sub');
  const saveRuleSubmitBtn = document.getElementById('save-rule-submit-btn');

  // Table elements
  const rulesTableBody = document.getElementById('rules-table-body');
  const tableEmptyState = document.getElementById('table-empty-state');
  const rulesSearchInput = document.getElementById('rules-search-input');

  // Backup elements
  const exportJsonBtn = document.getElementById('export-json-btn');
  const importJsonFile = document.getElementById('import-json-file');
  const loadPresetsBtn = document.getElementById('load-presets-btn');

  // State
  let currentSelectedType = 'domain_swap';
  let { rules = [], isMasterEnabled = true } = await chrome.storage.local.get(['rules', 'isMasterEnabled']);

  // Initialize UI
  masterToggle.checked = isMasterEnabled;
  updateEngineBadge();
  renderMetrics();
  renderTable();

  // Master switch
  masterToggle.addEventListener('change', async () => {
    isMasterEnabled = masterToggle.checked;
    await chrome.storage.local.set({ isMasterEnabled });
    updateEngineBadge();
    await notifySync();
    renderMetrics();
    renderTable();
  });

  function updateEngineBadge() {
    if (isMasterEnabled) {
      engineBadge.className = 'engine-badge';
      engineBadge.innerHTML = '<span class="indicator-dot"></span><span>DNR Engine Active</span>';
    } else {
      engineBadge.className = 'engine-badge disabled';
      engineBadge.innerHTML = '<span class="indicator-dot"></span><span>Engine Paused (OFF)</span>';
    }
  }

  // Type Selector Click
  typeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      typeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSelectedType = btn.dataset.type;

      fieldsDomainSwap.classList.add('hidden');
      fieldsExact.classList.add('hidden');
      fieldsRegex.classList.add('hidden');

      if (currentSelectedType === 'domain_swap') fieldsDomainSwap.classList.remove('hidden');
      if (currentSelectedType === 'exact') fieldsExact.classList.remove('hidden');
      if (currentSelectedType === 'regex') fieldsRegex.classList.remove('hidden');
    });
  });

  // Sandbox Test
  sandboxTestBtn.addEventListener('click', runSandbox);
  sandboxInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') runSandbox();
  });

  function runSandbox() {
    const val = sandboxInput.value.trim();
    if (!val) return;

    const res = simulateRedirect(val, rules, isMasterEnabled);
    sandboxOutput.classList.remove('hidden');

    simInputUrl.textContent = res.originalUrl || val;
    simOutputUrl.textContent = res.finalUrl;
    simOpenLink.href = res.finalUrl;

    if (res.redirected) {
      simMatchedRule.textContent = `Matched: "${res.matchedRule.name || 'Rule'}"`;
      simMatchedRule.style.background = 'rgba(0, 196, 204, 0.2)';
      simMatchedRule.style.color = '#00c4cc';
    } else {
      simMatchedRule.textContent = res.reason || 'No Active Match';
      simMatchedRule.style.background = 'rgba(148, 163, 184, 0.2)';
      simMatchedRule.style.color = '#94a3b8';
    }
  }

  // Form Submit (Save / Update)
  ruleForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const isEditing = !!editRuleId.value;
    let rulePayload = {};

    if (currentSelectedType === 'domain_swap') {
      const src = normalizeDomain(fieldSourceDomain.value);
      const tgt = normalizeDomain(fieldTargetDomain.value);
      if (!src || !tgt) {
        alert('Please fill out both original and target domain.');
        return;
      }
      if (src === tgt) {
        alert('Target domain must differ from original domain.');
        return;
      }
      rulePayload = {
        type: 'domain_swap',
        sourceHost: src,
        targetHost: tgt,
        name: (ruleName.value || '').trim() || `${src} → ${tgt}`
      };
    } else if (currentSelectedType === 'exact') {
      const src = fieldSourceUrl.value.trim();
      const tgt = fieldTargetUrl.value.trim();
      if (!src || !tgt) {
        alert('Please specify both source and target URL.');
        return;
      }
      rulePayload = {
        type: 'exact',
        sourceUrl: src,
        targetUrl: tgt,
        name: (ruleName.value || '').trim() || `Redirect: ${src}`
      };
    } else if (currentSelectedType === 'regex') {
      const pattern = fieldRegexPattern.value.trim();
      const sub = fieldRegexSub.value.trim();
      if (!pattern || !sub) {
        alert('Please specify both regex filter pattern and substitution string.');
        return;
      }
      rulePayload = {
        type: 'regex',
        regexPattern: pattern,
        regexSubstitution: sub,
        name: (ruleName.value || '').trim() || `Regex: ${pattern}`
      };
    }

    if (isEditing) {
      const targetIdx = rules.findIndex(r => r.id === editRuleId.value);
      if (targetIdx !== -1) {
        rules[targetIdx] = {
          ...rules[targetIdx],
          ...rulePayload,
          updated: Date.now()
        };
      }
    } else {
      const nextNumId = rules.reduce((max, r) => Math.max(max, r.numericId || 0), 0) + 1;
      const newRule = {
        id: `rule_${Date.now()}`,
        numericId: nextNumId,
        enabled: true,
        created: Date.now(),
        ...rulePayload
      };
      rules.unshift(newRule);
    }

    await chrome.storage.local.set({ rules });
    await notifySync();

    resetForm();
    renderMetrics();
    renderTable();
  });

  // Cancel Edit
  cancelEditBtn.addEventListener('click', resetForm);

  function resetForm() {
    editRuleId.value = '';
    formCardTitle.textContent = 'Add New Redirect Rule';
    saveRuleSubmitBtn.textContent = 'Save & Apply Rule';
    cancelEditBtn.classList.add('hidden');
    ruleForm.reset();

    // Default back to domain_swap
    typeButtons[0].click();
  }

  // Populate Edit
  function startEdit(rule) {
    editRuleId.value = rule.id;
    formCardTitle.textContent = `Edit Rule: ${rule.name}`;
    saveRuleSubmitBtn.textContent = 'Update Rule';
    cancelEditBtn.classList.remove('hidden');

    ruleName.value = rule.name || '';

    // Switch type
    const matchingTypeBtn = Array.from(typeButtons).find(b => b.dataset.type === rule.type);
    if (matchingTypeBtn) matchingTypeBtn.click();

    if (rule.type === 'domain_swap') {
      fieldSourceDomain.value = rule.sourceHost || '';
      fieldTargetDomain.value = rule.targetHost || '';
    } else if (rule.type === 'exact') {
      fieldSourceUrl.value = rule.sourceUrl || '';
      fieldTargetUrl.value = rule.targetUrl || '';
    } else if (rule.type === 'regex') {
      fieldRegexPattern.value = rule.regexPattern || '';
      fieldRegexSub.value = rule.regexSubstitution || '';
    }

    window.scrollTo({ top: document.querySelector('.editor-card').offsetTop - 20, behavior: 'smooth' });
  }

  // Render Table
  rulesSearchInput.addEventListener('input', renderTable);

  function renderTable() {
    const filterQuery = (rulesSearchInput.value || '').toLowerCase().trim();
    rulesTableBody.innerHTML = '';

    const filtered = rules.filter(r => {
      if (!filterQuery) return true;
      const nameMatch = (r.name || '').toLowerCase().includes(filterQuery);
      const srcMatch = (r.sourceHost || r.sourceUrl || r.regexPattern || '').toLowerCase().includes(filterQuery);
      const tgtMatch = (r.targetHost || r.targetUrl || r.regexSubstitution || '').toLowerCase().includes(filterQuery);
      return nameMatch || srcMatch || tgtMatch;
    });

    if (filtered.length === 0) {
      tableEmptyState.classList.remove('hidden');
      return;
    }
    tableEmptyState.classList.add('hidden');

    filtered.forEach((rule) => {
      const originalIndex = rules.findIndex(r => r.id === rule.id);
      const row = document.createElement('tr');
      if (!rule.enabled || !isMasterEnabled) {
        row.className = 'table-row-disabled';
      }

      // 1. Status Toggle
      const tdStatus = document.createElement('td');
      const switchLabel = document.createElement('label');
      switchLabel.className = 'switch';
      const switchInput = document.createElement('input');
      switchInput.type = 'checkbox';
      switchInput.checked = rule.enabled;
      switchInput.disabled = !isMasterEnabled;
      switchInput.addEventListener('change', async () => {
        rules[originalIndex].enabled = switchInput.checked;
        await chrome.storage.local.set({ rules });
        await notifySync();
        renderMetrics();
        renderTable();
      });
      const slider = document.createElement('span');
      slider.className = 'slider round';
      switchLabel.appendChild(switchInput);
      switchLabel.appendChild(slider);
      tdStatus.appendChild(switchLabel);

      // 2. Name
      const tdName = document.createElement('td');
      tdName.className = 'table-rule-name';
      tdName.textContent = rule.name || `Rule #${rule.numericId}`;

      // 3. Type
      const tdType = document.createElement('td');
      const pill = document.createElement('span');
      pill.className = `table-type-pill ${rule.type}`;
      pill.textContent = rule.type === 'domain_swap' ? 'Domain' : (rule.type === 'exact' ? 'Exact' : 'Regex');
      tdType.appendChild(pill);

      // 4. Source
      const tdSource = document.createElement('td');
      tdSource.className = 'table-source-mono';
      tdSource.textContent = rule.sourceHost || rule.sourceUrl || rule.regexPattern;

      // 5. Destination
      const tdTarget = document.createElement('td');
      tdTarget.className = 'table-target-mono';
      tdTarget.textContent = rule.targetHost || rule.targetUrl || rule.regexSubstitution;

      // 6. Actions
      const tdActions = document.createElement('td');
      tdActions.className = 'text-right';
      const actionsWrapper = document.createElement('div');
      actionsWrapper.className = 'table-actions';

      // Edit Button
      const editBtn = document.createElement('button');
      editBtn.className = 'btn-icon';
      editBtn.title = 'Edit Rule';
      editBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
      editBtn.addEventListener('click', () => startEdit(rule));

      // Duplicate Button
      const dupBtn = document.createElement('button');
      dupBtn.className = 'btn-icon';
      dupBtn.title = 'Duplicate Rule';
      dupBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
      dupBtn.addEventListener('click', async () => {
        const nextNumId = rules.reduce((max, r) => Math.max(max, r.numericId || 0), 0) + 1;
        const copy = {
          ...rule,
          id: `rule_${Date.now()}`,
          numericId: nextNumId,
          name: `${rule.name} (Copy)`,
          created: Date.now()
        };
        rules.splice(originalIndex + 1, 0, copy);
        await chrome.storage.local.set({ rules });
        await notifySync();
        renderMetrics();
        renderTable();
      });

      // Delete Button
      const delBtn = document.createElement('button');
      delBtn.className = 'btn-icon delete';
      delBtn.title = 'Delete Rule';
      delBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
      delBtn.addEventListener('click', async () => {
        if (confirm(`Delete rule "${rule.name}"?`)) {
          rules.splice(originalIndex, 1);
          await chrome.storage.local.set({ rules });
          await notifySync();
          renderMetrics();
          renderTable();
        }
      });

      actionsWrapper.appendChild(editBtn);
      actionsWrapper.appendChild(dupBtn);
      actionsWrapper.appendChild(delBtn);
      tdActions.appendChild(actionsWrapper);

      row.appendChild(tdStatus);
      row.appendChild(tdName);
      row.appendChild(tdType);
      row.appendChild(tdSource);
      row.appendChild(tdTarget);
      row.appendChild(tdActions);

      rulesTableBody.appendChild(row);
    });
  }

  // Render Metrics
  function renderMetrics() {
    metricTotal.textContent = rules.length;
    const active = isMasterEnabled ? rules.filter(r => r.enabled).length : 0;
    metricActive.textContent = active;
  }

  // Backup & Presets
  exportJsonBtn.addEventListener('click', () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({ rules, isMasterEnabled }, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `smart-link-redirector-backup-${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchor.click();
  });

  importJsonFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (Array.isArray(imported.rules)) {
          rules = imported.rules;
          if (typeof imported.isMasterEnabled === 'boolean') {
            isMasterEnabled = imported.isMasterEnabled;
            masterToggle.checked = isMasterEnabled;
          }
          await chrome.storage.local.set({ rules, isMasterEnabled });
          await notifySync();
          updateEngineBadge();
          renderMetrics();
          renderTable();
          alert(`Successfully imported ${rules.length} rules!`);
        } else {
          alert('Invalid backup format: missing rules array.');
        }
      } catch (err) {
        alert('Failed to parse backup JSON file: ' + err.message);
      }
      importJsonFile.value = '';
    };
    reader.readAsText(file);
  });

  loadPresetsBtn.addEventListener('click', async () => {
    if (!confirm('Load popular redirect sample rules? Existing rules will be kept.')) return;

    const samplePresets = [
      {
        id: `rule_sample_reddit_${Date.now()}`,
        name: 'Reddit to Old Reddit (Classic Interface)',
        enabled: true,
        type: 'domain_swap',
        sourceHost: 'reddit.com',
        targetHost: 'old.reddit.com',
        created: Date.now()
      },
      {
        id: `rule_sample_medium_${Date.now() + 2}`,
        name: 'Medium to Freedium (Paywall Bypass)',
        enabled: true,
        type: 'domain_swap',
        sourceHost: 'medium.com',
        targetHost: 'freedium.cfd',
        created: Date.now() + 2
      }
    ];

    let currentMaxNumId = rules.reduce((max, r) => Math.max(max, r.numericId || 0), 0);
    samplePresets.forEach(preset => {
      currentMaxNumId += 1;
      preset.numericId = currentMaxNumId;
      rules.push(preset);
    });

    await chrome.storage.local.set({ rules });
    await notifySync();
    renderMetrics();
    renderTable();
  });

  // Notify background service worker
  async function notifySync() {
    try {
      await chrome.runtime.sendMessage({ action: 'SYNC_RULES' });
    } catch (err) {
      console.warn('Background sync message failed:', err);
    }
  }
});
