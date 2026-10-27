import { RoutingRule } from '@/types/surge';

/**
 * Extracts a concise human-readable theme name from a Surge routing rule condition.
 */
export function getRuleThemeName(rule: RoutingRule): string {
  const t = rule.ruleType.toUpperCase();
  const pattern = (rule.pattern || '').trim().replace(/^["']|["']$/g, '');

  if (t === 'PROCESS-NAME') {
    // 1. Try matching .app
    const appMatch = pattern.match(/([^/]+)\.app/i);
    if (appMatch) {
      return appMatch[1].replace(/\s+/g, '');
    }
    // 2. Last segment after slash
    if (pattern.includes('/')) {
      const parts = pattern.split('/').filter(Boolean);
      const last = parts[parts.length - 1];
      return (last || 'App').replace(/\s+/g, '');
    }
    return (pattern || 'App').replace(/\s+/g, '');
  }

  if (t === 'RULE-SET') {
    // Strip query string and get last path segment
    const urlClean = pattern.split('?')[0];
    const parts = urlClean.split('/').filter(Boolean);
    const filename = parts[parts.length - 1] || 'RuleSet';
    try {
      const decoded = decodeURIComponent(filename);
      return decoded.replace(/\.(list|txt|conf)$/i, '');
    } catch {
      return filename.replace(/\.(list|txt|conf)$/i, '');
    }
  }

  if (t === 'DOMAIN-SUFFIX' || t === 'DOMAIN' || t === 'DOMAIN-KEYWORD') {
    // e.g. copilot.microsoft.com -> copilot
    // openai.com -> openai
    const parts = pattern.split('.');
    if (parts.length >= 2) {
      // If it's something like copilot.microsoft.com, pick the first subdomain
      return parts[0] || pattern;
    }
    return pattern || 'Domain';
  }

  if (t === 'GEOIP') {
    return pattern || 'CN';
  }

  if (t === 'IP-CIDR' || t === 'IP-CIDR6') {
    return pattern.split('/')[0] || pattern;
  }

  if (t === 'FINAL') {
    return (rule.targetPolicy || 'Direct').replace(/^["']|["']$/g, '').replace(/\s+/g, '');
  }

  if (t === 'OR') {
    const domainMatch = pattern.match(/DOMAIN(?:-SUFFIX)?,([a-zA-Z0-9_\-\.]+)/i);
    if (domainMatch) {
      const firstDomain = domainMatch[1].split('.')[0];
      return `${firstDomain}-多项`;
    }
    return 'Multi';
  }

  return pattern.slice(0, 12) || 'Rule';
}

/**
 * Normalizes rule types into clean, concise category badges (App, Set, Domain, Geo, Final, etc.)
 */
export function getRuleCategory(ruleType: string): string {
  const t = ruleType.toUpperCase();
  if (t === 'PROCESS-NAME') return 'App';
  if (t === 'RULE-SET') return 'Set';
  if (t === 'DOMAIN' || t === 'DOMAIN-SUFFIX' || t === 'DOMAIN-KEYWORD') return 'Domain';
  if (t === 'GEOIP') return 'Geo';
  if (t === 'IP-CIDR' || t === 'IP-CIDR6') return 'IP';
  if (t === 'FINAL') return 'Final';
  if (t === 'OR') return 'OR';
  return t;
}

/**
 * Returns formatted concise title: {两位序号}-{Type}-{主题名}
 * e.g. 01-App-superwhisper, 10-Set-Gemini&Antigravity
 */
export function formatRuleTitle(rule: RoutingRule, index: number): string {
  const numStr = String(index + 1).padStart(2, '0');
  const category = getRuleCategory(rule.ruleType);
  const theme = getRuleThemeName(rule);

  if (category === 'Final') {
    return `${numStr}-Final`;
  }

  return `${numStr}-${category}-${theme}`;
}

/**
 * Returns styling classes for category badges
 */
export function getCategoryBadgeStyle(category: string): string {
  switch (category) {
    case 'App':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Set':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'Domain':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Geo':
      return 'bg-teal-50 text-teal-700 border-teal-200';
    case 'IP':
      return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    case 'Final':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    default:
      return 'bg-neutral-100 text-neutral-700 border-neutral-200';
  }
}
