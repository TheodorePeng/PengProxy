import type { ParsedProfile, PolicyGroup, RawLine, RoutingRule, SurgeSectionName } from '../../types/surge.ts';

/**
 * Splits a comma-separated string while respecting quotes ("..." or '...')
 */
export function splitRespectingQuotes(str: string, delimiter: string = ','): string[] {
  const tokens: string[] = [];
  let current = '';
  let inDouble = false;
  let inSingle = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '"' && !inSingle) {
      inDouble = !inDouble;
      current += char;
    } else if (char === "'" && !inDouble) {
      inSingle = !inSingle;
      current += char;
    } else if (char === delimiter && !inDouble && !inSingle) {
      tokens.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim().length > 0) {
    tokens.push(current.trim());
  }
  return tokens;
}

/**
 * Strips surrounding quotes if present
 */
export function unquote(str: string): string {
  const trimmed = str.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/**
 * Parses a Surge [Proxy Group] line into a structured object
 */
export function parseProxyGroupLine(line: string, index: number): PolicyGroup | null {
  const eqIdx = line.indexOf('=');
  if (eqIdx === -1) return null;

  const rawName = line.slice(0, eqIdx).trim();
  const name = unquote(rawName);
  const rest = line.slice(eqIdx + 1).trim();

  const tokens = splitRespectingQuotes(rest, ',');
  if (tokens.length === 0) return null;

  const type = unquote(tokens[0]);
  const members: string[] = [];
  const options: Record<string, string> = {};

  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];
    const optionEqIdx = token.indexOf('=');
    if (optionEqIdx !== -1) {
      const optKey = token.slice(0, optionEqIdx).trim();
      const optVal = unquote(token.slice(optionEqIdx + 1).trim());
      options[optKey] = optVal;
    } else {
      members.push(unquote(token));
    }
  }

  return {
    id: `pg-${index}-${name}`,
    name,
    type,
    members,
    options,
    rawLineIndex: index,
  };
}

/**
 * Parses a Surge [Rule] line into a structured object
 */
export function parseRuleLine(line: string, index: number): RoutingRule | null {
  // Check for line-end comment
  let rulePart = line;
  let comment = '';
  const hashIdx = line.indexOf('#');
  const semiIdx = line.indexOf(';');
  const commentIdx = hashIdx !== -1 ? hashIdx : semiIdx;

  if (commentIdx !== -1) {
    rulePart = line.slice(0, commentIdx).trim();
    comment = line.slice(commentIdx).trim();
  }

  const tokens = splitRespectingQuotes(rulePart, ',');
  if (tokens.length < 2) return null;

  const ruleType = unquote(tokens[0]).toUpperCase();

  // Special case: FINAL rule
  if (ruleType === 'FINAL') {
    const targetPolicy = unquote(tokens[1]);
    const options = tokens.slice(2).map(unquote);
    return {
      id: `rule-${index}-FINAL`,
      ruleType: 'FINAL',
      pattern: '',
      targetPolicy,
      options,
      comment,
      rawLineIndex: index,
    };
  }

  const pattern = unquote(tokens[1]);
  const targetPolicy = tokens[2] ? unquote(tokens[2]) : '';
  const options = tokens.slice(3).map(unquote);

  return {
    id: `rule-${index}-${ruleType}`,
    ruleType,
    pattern,
    targetPolicy,
    options,
    comment,
    rawLineIndex: index,
  };
}

/**
 * Main Lossless Parser
 */
export function parseSurgeProfile(content: string): ParsedProfile {
  const lines = content.split(/\r?\n/);
  const rawLines: RawLine[] = [];
  const policyGroups: PolicyGroup[] = [];
  const rules: RoutingRule[] = [];
  const sectionIndices: Record<string, { start: number; end: number }> = {};

  let currentSection: SurgeSectionName | null = null;
  let currentSectionStart = 0;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();
    const id = `line-${i}`;

    if (!trimmed) {
      rawLines.push({ id, raw, type: 'blank', section: currentSection });
      continue;
    }

    if (trimmed.startsWith('#') || trimmed.startsWith(';')) {
      rawLines.push({ id, raw, type: 'comment', section: currentSection });
      continue;
    }

    const headerMatch = trimmed.match(/^\[(.*)\]$/);
    if (headerMatch) {
      if (currentSection) {
        sectionIndices[currentSection] = { start: currentSectionStart, end: i - 1 };
      }
      currentSection = headerMatch[1];
      currentSectionStart = i;
      rawLines.push({ id, raw, type: 'section-header', section: currentSection });
      continue;
    }

    if (currentSection === 'Proxy Group') {
      const pg = parseProxyGroupLine(raw, i);
      if (pg) {
        policyGroups.push(pg);
        rawLines.push({ id, raw, type: 'policy-group', section: currentSection, parsedId: pg.id });
        continue;
      }
    }

    if (currentSection === 'Rule') {
      const rule = parseRuleLine(raw, i);
      if (rule) {
        rules.push(rule);
        rawLines.push({ id, raw, type: 'rule', section: currentSection, parsedId: rule.id });
        continue;
      }
    }

    rawLines.push({ id, raw, type: 'other', section: currentSection });
  }

  if (currentSection) {
    sectionIndices[currentSection] = { start: currentSectionStart, end: lines.length - 1 };
  }

  return {
    rawLines,
    policyGroups,
    rules,
    sectionIndices,
  };
}
