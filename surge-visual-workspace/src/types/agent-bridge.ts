import { PolicyGroup, RoutingRule, ProfileDiff } from './surge';

export interface AgentActionPlan {
  message?: string;
  focusGroupName?: string;
  focusRuleId?: string;
  addGroups?: PolicyGroup[];
  updateGroups?: Array<{ name: string; patch: Partial<PolicyGroup> }>;
  deleteGroups?: string[]; // group IDs
  addRules?: Array<{
    ruleType: string;
    pattern: string;
    targetPolicy: string;
    options?: string[];
    positionIndex?: number;
  }>;
  updateRules?: Array<{
    ruleId?: string;
    pattern?: string;
    patch: Partial<RoutingRule>;
  }>;
  deleteRules?: Array<{
    ruleId?: string;
    pattern?: string;
  }>;
  openReviewModal?: boolean;
}

export interface SurgeWorkspaceState {
  version: string;
  fileName: string;
  isDemo: boolean;
  hasChanges: boolean;
  changeCount: number;
  policyGroupCount: number;
  routingRuleCount: number;
  policyGroups: PolicyGroup[];
  rules: RoutingRule[];
}

export interface SurgeWorkspaceAPI {
  version: string;
  getState: () => SurgeWorkspaceState;
  getRawText: () => string;
  getModifiedText: () => string;
  getDiff: () => ProfileDiff;

  // UI Orchestration
  focusGroup: (groupName: string) => boolean;
  focusRule: (ruleIdOrPattern: string) => boolean;
  openGroupDetail: (groupName: string) => boolean;
  closeGroupDetail: () => void;
  openChangesModal: () => void;
  closeChangesModal: () => void;
  filterByGroup: (groupName: string | null) => void;

  // Strategic Mutations
  loadProfile: (content: string, fileName?: string) => void;
  resetDraft: () => void;
  addGroup: (newGroup: PolicyGroup) => void;
  updateGroup: (groupName: string, patch: Partial<PolicyGroup>) => boolean;
  deleteGroup: (groupName: string) => boolean;
  addRule: (rule: Partial<RoutingRule>, targetGroup?: string, insertIndex?: number) => void;
  updateRule: (ruleId: string, patch: Partial<RoutingRule>) => boolean;
  deleteRule: (ruleIdOrPattern: string) => boolean;

  // Batch Plan Execution
  batchApplyPlan: (plan: AgentActionPlan) => {
    success: boolean;
    appliedGroupsCount: number;
    appliedRulesCount: number;
    message: string;
  };
}

declare global {
  interface Window {
    __SURGE_WORKSPACE__?: SurgeWorkspaceAPI;
  }
}
