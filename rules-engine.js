/**
 * Shared Rule Engine for Smart Link & URL Redirector
 */

// Helper to normalize host / domain inputs
function normalizeDomain(input) {
  if (!input) return '';
  let str = input.trim();
  // Remove protocol if present
  str = str.replace(/^[a-zA-Z]+:\/\//, '');
  // Remove path or query string
  str = str.split('/')[0].split('?')[0].split('#')[0];
  // Remove port if present
  str = str.split(':')[0];
  return str.toLowerCase().trim();
}

// Convert user configuration rules into Chrome declarativeNetRequest rules
function compileDnrRules(rules, isMasterEnabled = true) {
  if (!isMasterEnabled || !Array.isArray(rules)) {
    return [];
  }

  const dnrRules = [];

  for (const rule of rules) {
    if (!rule.enabled || !rule.numericId) continue;

    try {
      if (rule.type === 'domain_swap') {
        const sourceHost = normalizeDomain(rule.sourceHost);
        const targetHost = normalizeDomain(rule.targetHost);
        if (!sourceHost || !targetHost) continue;

        const domains = [sourceHost];
        if (!sourceHost.startsWith('www.')) {
          domains.push(`www.${sourceHost}`);
        }

        dnrRules.push({
          id: rule.numericId,
          priority: 1,
          action: {
            type: 'redirect',
            redirect: {
              transform: {
                host: targetHost,
                scheme: 'https'
              }
            }
          },
          condition: {
            requestDomains: domains,
            resourceTypes: ['main_frame', 'sub_frame']
          }
        });
      } else if (rule.type === 'exact') {
        const sourceUrl = (rule.sourceUrl || '').trim();
        const targetUrl = (rule.targetUrl || '').trim();
        if (!sourceUrl || !targetUrl) continue;

        dnrRules.push({
          id: rule.numericId,
          priority: 2,
          action: {
            type: 'redirect',
            redirect: {
              url: targetUrl
            }
          },
          condition: {
            urlFilter: `|${sourceUrl}|`,
            resourceTypes: ['main_frame', 'sub_frame']
          }
        });
      } else if (rule.type === 'regex') {
        const regexPattern = (rule.regexPattern || '').trim();
        const regexSub = (rule.regexSubstitution || '').trim();
        if (!regexPattern || !regexSub) continue;

        dnrRules.push({
          id: rule.numericId,
          priority: 2,
          action: {
            type: 'redirect',
            redirect: {
              regexSubstitution: regexSub
            }
          },
          condition: {
            regexFilter: regexPattern,
            resourceTypes: ['main_frame', 'sub_frame']
          }
        });
      }
    } catch (err) {
      console.error('Failed to compile rule:', rule, err);
    }
  }

  return dnrRules;
}

// Simulate client-side redirect for live tester & content script
function simulateRedirect(inputUrl, rules, isMasterEnabled = true) {
  if (!isMasterEnabled || !inputUrl) {
    return { redirected: false, finalUrl: inputUrl, reason: !isMasterEnabled ? 'Master switch is OFF' : 'Empty URL' };
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(inputUrl.startsWith('http') ? inputUrl : `https://${inputUrl}`);
  } catch (e) {
    return { redirected: false, finalUrl: inputUrl, error: 'Invalid URL format' };
  }

  const activeRules = rules.filter(r => r.enabled);

  for (const rule of activeRules) {
    if (rule.type === 'domain_swap') {
      const source = normalizeDomain(rule.sourceHost);
      const target = normalizeDomain(rule.targetHost);
      const host = parsedUrl.hostname.toLowerCase();

      // Check if domain matches (exact host, www.host, or subdomain of host)
      if (host === source || host === `www.${source}` || host.endsWith(`.${source}`)) {
        const resultUrl = new URL(parsedUrl.href);
        resultUrl.hostname = target;
        resultUrl.protocol = 'https:';
        return {
          redirected: true,
          originalUrl: parsedUrl.href,
          finalUrl: resultUrl.href,
          matchedRule: rule
        };
      }
    } else if (rule.type === 'exact') {
      if (parsedUrl.href === rule.sourceUrl.trim()) {
        return {
          redirected: true,
          originalUrl: parsedUrl.href,
          finalUrl: rule.targetUrl.trim(),
          matchedRule: rule
        };
      }
    } else if (rule.type === 'regex') {
      try {
        const re = new RegExp(rule.regexPattern.trim());
        if (re.test(parsedUrl.href)) {
          // Emulate \1, \2 substitution
          const sub = rule.regexSubstitution.trim().replace(/\\(\d+)/g, '$$$1');
          const replaced = parsedUrl.href.replace(re, sub);
          return {
            redirected: true,
            originalUrl: parsedUrl.href,
            finalUrl: replaced,
            matchedRule: rule
          };
        }
      } catch (regexErr) {
        // Invalid regex
      }
    }
  }

  return {
    redirected: false,
    originalUrl: parsedUrl.href,
    finalUrl: parsedUrl.href,
    reason: 'No matching rule found'
  };
}

// Export for Node/Tests or global browser scope
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { normalizeDomain, compileDnrRules, simulateRedirect };
}
