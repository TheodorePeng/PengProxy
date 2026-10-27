import type { ParsedProfile, PolicyGroup, RoutingRule } from '../../types/surge.ts';

function quoteIfNeeded(val: string): string {
  if (val.includes(',') || val.includes(' ') || val.includes('=')) {
    return `"${val}"`;
  }
  return val;
}

export function formatPolicyGroup(pg: PolicyGroup): string {
  const parts: string[] = [pg.type];

  // Members
  for (const m of pg.members) {
    parts.push(quoteIfNeeded(m));
  }

  // Options
  for (const [k, v] of Object.entries(pg.options)) {
    if (v !== undefined && v !== '') {
      parts.push(`${k}=${quoteIfNeeded(v)}`);
    }
  }

  const namePart = quoteIfNeeded(pg.name);
  return `${namePart} = ${parts.join(', ')}`;
}

export function formatRule(rule: RoutingRule): string {
  const parts: string[] = [rule.ruleType];

  if (rule.ruleType === 'FINAL') {
    parts.push(quoteIfNeeded(rule.targetPolicy));
  } else {
    parts.push(rule.pattern.includes(',') ? `"${rule.pattern}"` : rule.pattern);
    parts.push(quoteIfNeeded(rule.targetPolicy));
  }

  for (const opt of rule.options) {
    if (opt) parts.push(quoteIfNeeded(opt));
  }

  let line = parts.join(',');
  if (rule.comment) {
    line += ` ${rule.comment}`;
  }
  return line;
}

function isPolicyGroupUnchanged(a: PolicyGroup, b: PolicyGroup): boolean {
  if (a.name !== b.name || a.type !== b.type) return false;
  if (a.members.length !== b.members.length) return false;
  for (let i = 0; i < a.members.length; i++) {
    if (a.members[i] !== b.members[i]) return false;
  }
  const keysA = Object.keys(a.options).filter((k) => a.options[k] !== undefined && a.options[k] !== '');
  const keysB = Object.keys(b.options).filter((k) => b.options[k] !== undefined && b.options[k] !== '');
  if (keysA.length !== keysB.length) return false;
  for (const k of keysA) {
    if (a.options[k] !== b.options[k]) return false;
  }
  return true;
}

function isRuleUnchanged(a: RoutingRule, b: RoutingRule): boolean {
  if (
    a.ruleType !== b.ruleType ||
    a.pattern !== b.pattern ||
    a.targetPolicy !== b.targetPolicy ||
    a.comment !== b.comment
  ) {
    return false;
  }
  if (a.options.length !== b.options.length) return false;
  for (let i = 0; i < a.options.length; i++) {
    if (a.options[i] !== b.options[i]) return false;
  }
  return true;
}

export function serializeSurgeProfile(
  originalProfile: ParsedProfile,
  draftPolicyGroups: PolicyGroup[],
  draftRules: RoutingRule[]
): string {
  const outputLines: string[] = [];
  const rawLines = originalProfile.rawLines;

  // Check if rules were reordered or count changed
  const rulesOrderChanged =
    draftRules.length !== originalProfile.rules.length ||
    draftRules.some((r, idx) => r.id !== originalProfile.rules[idx]?.id);

  // Map of existing group id -> draft group
  const groupMap = new Map<string, PolicyGroup>();
  for (const g of draftPolicyGroups) {
    groupMap.set(g.id, g);
  }

  // Newly added groups (not in original)
  const newlyAddedGroups = draftPolicyGroups.filter(
    (g) => !originalProfile.policyGroups.some((orig) => orig.id === g.id)
  );

  let inRuleSection = false;
  let hasVisitedRuleSection = false;
  let inProxyGroupSection = false;
  let hasVisitedProxyGroupSection = false;
  let nextDraftRuleIdx = 0;

  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = rawLines[i];

    // Detect Section Headers
    if (rawLine.type === 'section-header') {
      // Flush added groups if leaving [Proxy Group]
      if (hasVisitedProxyGroupSection && inProxyGroupSection && newlyAddedGroups.length > 0) {
        for (const newPg of newlyAddedGroups) {
          outputLines.push(formatPolicyGroup(newPg));
        }
        newlyAddedGroups.length = 0;
      }

      // Flush remaining rules if leaving [Rule] and order had changed
      if (hasVisitedRuleSection && inRuleSection && rulesOrderChanged) {
        while (nextDraftRuleIdx < draftRules.length) {
          outputLines.push(formatRule(draftRules[nextDraftRuleIdx++]));
        }
      }

      if (rawLine.section === 'Proxy Group') {
        inProxyGroupSection = true;
        hasVisitedProxyGroupSection = true;
      } else {
        inProxyGroupSection = false;
      }

      if (rawLine.section === 'Rule') {
        inRuleSection = true;
        hasVisitedRuleSection = true;
      } else {
        inRuleSection = false;
      }

      outputLines.push(rawLine.raw);
      continue;
    }

    if (rawLine.type === 'policy-group' && rawLine.parsedId) {
      const draftGroup = groupMap.get(rawLine.parsedId);
      if (draftGroup) {
        const origMatch = originalProfile.policyGroups.find((orig) => orig.id === draftGroup.id);
        if (origMatch && isPolicyGroupUnchanged(origMatch, draftGroup)) {
          outputLines.push(rawLine.raw);
        } else {
          outputLines.push(formatPolicyGroup(draftGroup));
        }
      }
      continue;
    }

    if (rawLine.type === 'rule') {
      if (!rulesOrderChanged) {
        // Order unchanged: output matching rule in-place
        const draftRule = draftRules.find((r) => r.id === rawLine.parsedId);
        if (draftRule) {
          const origMatch = originalProfile.rules.find((orig) => orig.id === draftRule.id);
          if (origMatch && isRuleUnchanged(origMatch, draftRule)) {
            outputLines.push(rawLine.raw);
          } else {
            outputLines.push(formatRule(draftRule));
          }
        }
      } else {
        // Order changed: output draft rules in current user order
        if (nextDraftRuleIdx < draftRules.length) {
          const rule = draftRules[nextDraftRuleIdx++];
          const origMatch = originalProfile.rules.find((orig) => orig.id === rule.id);
          if (origMatch && isRuleUnchanged(origMatch, rule) && rawLines[rule.rawLineIndex]) {
            outputLines.push(rawLines[rule.rawLineIndex].raw);
          } else {
            outputLines.push(formatRule(rule));
          }
        }
      }
      continue;
    }

    outputLines.push(rawLine.raw);
  }

  // Trailing flushes at EOF
  if (newlyAddedGroups.length > 0) {
    for (const newPg of newlyAddedGroups) {
      outputLines.push(formatPolicyGroup(newPg));
    }
  }
  if (rulesOrderChanged) {
    while (nextDraftRuleIdx < draftRules.length) {
      outputLines.push(formatRule(draftRules[nextDraftRuleIdx++]));
    }
  }

  return outputLines.join('\n');
}
