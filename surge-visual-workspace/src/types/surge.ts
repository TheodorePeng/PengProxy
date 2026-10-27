export const SURGE_TYPES_VERSION = '1.0.0';

export type SurgeSectionName =
  | 'General'
  | 'Proxy Group'
  | 'Rule'
  | 'Host'
  | 'URL Rewrite'
  | 'Header Rewrite'
  | 'Script'
  | 'MITM'
  | string;

export interface RawLine {
  id: string;
  raw: string;
  type: 'blank' | 'comment' | 'section-header' | 'policy-group' | 'rule' | 'other';
  section: SurgeSectionName | null;
  parsedId?: string;
}

export interface PolicyGroup {
  id: string;
  name: string;
  type: 'select' | 'url-test' | 'fallback' | 'load-balance' | string;
  members: string[];
  options: {
    interval?: string;
    timeout?: string;
    tolerance?: string;
    'policy-regex-filter'?: string;
    'include-other-group'?: string;
    'include-all-proxies'?: string;
    'policy-path'?: string;
    [key: string]: string | undefined;
  };
  rawLineIndex: number;
}

export interface RoutingRule {
  id: string;
  ruleType:
    | 'RULE-SET'
    | 'DOMAIN-SUFFIX'
    | 'DOMAIN'
    | 'DOMAIN-KEYWORD'
    | 'PROCESS-NAME'
    | 'IP-CIDR'
    | 'IP-CIDR6'
    | 'GEOIP'
    | 'USER-AGENT'
    | 'URL-REGEX'
    | 'FINAL'
    | string;
  pattern: string;
  targetPolicy: string;
  options: string[]; // e.g. ["no-resolve", "update-interval=86400"]
  comment?: string;
  rawLineIndex: number;
}

export interface ParsedProfile {
  rawLines: RawLine[];
  policyGroups: PolicyGroup[];
  rules: RoutingRule[];
  sectionIndices: Record<string, { start: number; end: number }>;
}

export interface DiffLine {
  type: 'add' | 'remove' | 'unchanged';
  value: string;
  oldLineNumber?: number;
  newLineNumber?: number;
}

export interface ProfileDiff {
  hasChanges: boolean;
  diffLines: DiffLine[];
  originalText: string;
  modifiedText: string;
  summary: {
    addedLines: number;
    removedLines: number;
    changedGroups: number;
    changedRules: number;
  };
}
