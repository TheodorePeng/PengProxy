import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ParsedProfile, PolicyGroup, RoutingRule } from '@/types/surge';
import { AgentActionPlan, SurgeWorkspaceAPI } from '@/types/agent-bridge';
import { parseSurgeProfile } from '@/lib/parser/lossless-parser';
import { serializeSurgeProfile } from '@/lib/parser/lossless-serializer';
import { computeProfileDiff } from '@/lib/parser/diff-engine';
import { DEMO_SURGE_CONFIG } from '@/lib/demo-data';
import { Header } from '@/components/layout/Header';
import { ResizableSplit } from '@/components/layout/ResizableSplit';
import { PolicyGroupTable } from '@/components/tables/PolicyGroupTable';
import { RoutingRulesTable } from '@/components/tables/RoutingRulesTable';
import { GroupDetailDrawer } from '@/components/modals/GroupDetailDrawer';
import { ChangesModal } from '@/components/modals/ChangesModal';
import { PasteConfigModal } from '@/components/modals/PasteConfigModal';
import { DragDropOverlay } from '@/components/ui/DragDropOverlay';
import { AgentToast, AgentToastData } from '@/components/ui/AgentToast';

export const App: React.FC = () => {
  const [fileName, setFileName] = useState<string>('Surge-Peng.conf');
  const [rawText, setRawText] = useState<string>('');
  const [isDemo, setIsDemo] = useState<boolean>(true);

  // Original profile representation
  const [originalProfile, setOriginalProfile] = useState<ParsedProfile | null>(null);

  // Draft state (modified by user in the UI)
  const [draftPolicyGroups, setDraftPolicyGroups] = useState<PolicyGroup[]>([]);
  const [draftRules, setDraftRules] = useState<RoutingRule[]>([]);

  // UI state
  const [activeRuleFilterGroup, setActiveRuleFilterGroup] = useState<string | null>(null);
  const [highlightedRuleId, setHighlightedRuleId] = useState<string | null>(null);
  const [agentHighlightedGroupName, setAgentHighlightedGroupName] = useState<string | null>(null);
  const [agentToast, setAgentToast] = useState<AgentToastData | null>(null);

  const [isSwapped, setIsSwapped] = useState<boolean>(false);
  const [activeGroupDetail, setActiveGroupDetail] = useState<PolicyGroup | null>(null);
  const [isChangesModalOpen, setIsChangesModalOpen] = useState<boolean>(false);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState<boolean>(false);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);

  const loadProfileText = useCallback(
    (name: string, content: string, isDemoData: boolean) => {
      try {
        const parsed = parseSurgeProfile(content);
        setFileName(name);
        setRawText(content);
        setIsDemo(isDemoData);
        setOriginalProfile(parsed);
        setDraftPolicyGroups(parsed.policyGroups);
        setDraftRules(parsed.rules);
        setActiveRuleFilterGroup(null);
      } catch (e) {
        console.error('Failed to parse Surge profile', e);
        alert('解析配置文件失败，请检查文件格式是否规范。');
      }
    },
    []
  );

  // Initialize with Demo data on first load
  useEffect(() => {
    loadProfileText('Surge-Peng.conf (Demo)', DEMO_SURGE_CONFIG, true);
  }, [loadProfileText]);

  // Window-level Drag and Drop
  useEffect(() => {
    let dragCounter = 0;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter++;
      if (e.dataTransfer?.types.includes('Files')) {
        setIsDraggingOver(true);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0) {
        setIsDraggingOver(false);
        dragCounter = 0;
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter = 0;
      setIsDraggingOver(false);

      const file = e.dataTransfer?.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          loadProfileText(file.name, reader.result as string, false);
        };
        reader.readAsText(file);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [loadProfileText]);

  // Global Shortcut Cmd+V to open paste modal when not typing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'v') {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag !== 'input' && activeTag !== 'textarea') {
          setIsPasteModalOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleResetDraft = useCallback(() => {
    if (!originalProfile) return;
    setDraftPolicyGroups(originalProfile.policyGroups);
    setDraftRules(originalProfile.rules);
    setActiveRuleFilterGroup(null);
  }, [originalProfile]);

  // Group mutations
  const handleUpdateGroup = useCallback((updatedGroup: PolicyGroup, oldName?: string) => {
    setDraftPolicyGroups((prev) =>
      prev.map((g) => (g.id === updatedGroup.id ? updatedGroup : g))
    );

    // Cascade rename if group name was modified
    if (oldName && oldName !== updatedGroup.name) {
      setDraftRules((prev) =>
        prev.map((r) =>
          r.targetPolicy === oldName ? { ...r, targetPolicy: updatedGroup.name } : r
        )
      );
      if (activeRuleFilterGroup === oldName) {
        setActiveRuleFilterGroup(updatedGroup.name);
      }
    }
  }, [activeRuleFilterGroup]);

  const handleAddGroup = useCallback((newGroup: PolicyGroup) => {
    setDraftPolicyGroups((prev) => [...prev, newGroup]);
  }, []);

  const handleDeleteGroup = useCallback((groupId: string) => {
    setDraftPolicyGroups((prev) => prev.filter((g) => g.id !== groupId));
  }, []);

  // Rule mutations
  const handleUpdateRulesOrder = useCallback((reorderedRules: RoutingRule[]) => {
    setDraftRules(reorderedRules);
  }, []);

  const handleUpdateRule = useCallback((updatedRule: RoutingRule) => {
    setDraftRules((prev) =>
      prev.map((r) => (r.id === updatedRule.id ? updatedRule : r))
    );
  }, []);

  const handleAddRule = useCallback((newRule: RoutingRule) => {
    setDraftRules((prev) => [...prev, newRule]);
  }, []);

  const handleDeleteRule = useCallback((ruleId: string) => {
    setDraftRules((prev) => prev.filter((r) => r.id !== ruleId));
  }, []);

  // Cross-table jump & highlight navigation
  const handleNavigateToRule = useCallback((ruleId: string) => {
    setActiveRuleFilterGroup(null); // Clear group filter so target rule is guaranteed visible
    setHighlightedRuleId(ruleId);
    setTimeout(() => {
      setHighlightedRuleId((curr) => (curr === ruleId ? null : curr));
    }, 2800);
  }, []);

  // Group focus highlight
  const handleFocusGroup = useCallback((groupName: string) => {
    setAgentHighlightedGroupName(groupName);
    setTimeout(() => {
      setAgentHighlightedGroupName((curr) => (curr === groupName ? null : curr));
    }, 3000);
  }, []);

  // Relation toggle
  const handleToggleRuleRelation = useCallback((ruleId: string, groupName: string) => {
    setDraftRules((prev) =>
      prev.map((r) => {
        if (r.id !== ruleId) return r;
        const newTarget = r.targetPolicy === groupName ? 'DIRECT' : groupName;
        return { ...r, targetPolicy: newTarget };
      })
    );
  }, []);

  // Unlink single rule
  const handleUnlinkRule = useCallback((ruleId: string) => {
    setDraftRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, targetPolicy: 'DIRECT' } : r))
    );
  }, []);

  // Single-cell revert relation for group
  const handleRevertGroupRules = useCallback((groupName: string) => {
    if (!originalProfile) return;
    const origMap = new Map(originalProfile.rules.map((r) => [r.id, r.targetPolicy]));

    setDraftRules((prev) =>
      prev.map((r) => {
        const origTarget = origMap.get(r.id);
        if (origTarget === groupName || r.targetPolicy === groupName) {
          return { ...r, targetPolicy: origTarget || 'DIRECT' };
        }
        return r;
      })
    );
  }, [originalProfile]);

  // Compute live diff
  const modifiedText = useMemo(() => {
    if (!originalProfile) return '';
    return serializeSurgeProfile(originalProfile, draftPolicyGroups, draftRules);
  }, [originalProfile, draftPolicyGroups, draftRules]);

  const diff = useMemo(() => {
    return computeProfileDiff(rawText, modifiedText);
  }, [rawText, modifiedText]);

  const changeCount = diff.summary.addedLines + diff.summary.removedLines;

  // Mount Safe Headless Agent Bridge (window.__SURGE_WORKSPACE__)
  useEffect(() => {
    const api: SurgeWorkspaceAPI = {
      version: '1.0.0',
      getState: () => ({
        version: '1.0.0',
        fileName,
        isDemo,
        hasChanges: diff.hasChanges,
        changeCount,
        policyGroupCount: draftPolicyGroups.length,
        routingRuleCount: draftRules.length,
        policyGroups: draftPolicyGroups,
        rules: draftRules,
      }),
      getRawText: () => rawText,
      getModifiedText: () => modifiedText,
      getDiff: () => diff,

      // UI Orchestration
      focusGroup: (groupName: string) => {
        const found = draftPolicyGroups.some((g) => g.name === groupName);
        if (found) {
          handleFocusGroup(groupName);
          return true;
        }
        return false;
      },
      focusRule: (ruleIdOrPattern: string) => {
        const found = draftRules.find(
          (r) =>
            r.id === ruleIdOrPattern ||
            r.pattern.toLowerCase().includes(ruleIdOrPattern.toLowerCase())
        );
        if (found) {
          handleNavigateToRule(found.id);
          return true;
        }
        return false;
      },
      openGroupDetail: (groupName: string) => {
        const g = draftPolicyGroups.find((item) => item.name === groupName);
        if (g) {
          setActiveGroupDetail(g);
          return true;
        }
        return false;
      },
      closeGroupDetail: () => setActiveGroupDetail(null),
      openChangesModal: () => setIsChangesModalOpen(true),
      closeChangesModal: () => setIsChangesModalOpen(false),
      filterByGroup: (groupName: string | null) => setActiveRuleFilterGroup(groupName),

      // Strategic Mutations
      loadProfile: (content: string, name?: string) => {
        loadProfileText(name || 'Surge-Peng.conf', content, false);
      },
      resetDraft: () => handleResetDraft(),
      addGroup: (newGroup: PolicyGroup) => handleAddGroup(newGroup),
      updateGroup: (groupName: string, patch: Partial<PolicyGroup>) => {
        const existing = draftPolicyGroups.find((g) => g.name === groupName);
        if (!existing) return false;
        handleUpdateGroup({ ...existing, ...patch });
        return true;
      },
      deleteGroup: (groupName: string) => {
        const existing = draftPolicyGroups.find((g) => g.name === groupName);
        if (!existing) return false;
        handleDeleteGroup(existing.id);
        return true;
      },
      addRule: (rule: Partial<RoutingRule>, targetGroup?: string, insertIndex?: number) => {
        const newRule: RoutingRule = {
          id: `rule-agent-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          ruleType: rule.ruleType || 'DOMAIN-SUFFIX',
          pattern: rule.pattern || 'example.com',
          targetPolicy: targetGroup || rule.targetPolicy || 'DIRECT',
          options: rule.options || [],
          rawLineIndex: -1,
        };
        if (insertIndex !== undefined && insertIndex >= 0) {
          setDraftRules((prev) => {
            const next = [...prev];
            next.splice(insertIndex, 0, newRule);
            return next;
          });
        } else {
          handleAddRule(newRule);
        }
      },
      updateRule: (ruleId: string, patch: Partial<RoutingRule>) => {
        const existing = draftRules.find((r) => r.id === ruleId);
        if (!existing) return false;
        handleUpdateRule({ ...existing, ...patch });
        return true;
      },
      deleteRule: (ruleIdOrPattern: string) => {
        const existing = draftRules.find(
          (r) => r.id === ruleIdOrPattern || r.pattern === ruleIdOrPattern
        );
        if (!existing) return false;
        handleDeleteRule(existing.id);
        return true;
      },

      // Batch Plan Execution
      batchApplyPlan: (plan: AgentActionPlan) => {
        let appliedGroups = 0;
        let appliedRules = 0;

        // Apply group additions
        if (plan.addGroups && plan.addGroups.length > 0) {
          setDraftPolicyGroups((prev) => [...prev, ...plan.addGroups!]);
          appliedGroups += plan.addGroups.length;
        }

        // Apply group updates
        if (plan.updateGroups && plan.updateGroups.length > 0) {
          setDraftPolicyGroups((prev) =>
            prev.map((g) => {
              const item = plan.updateGroups!.find((u) => u.name === g.name);
              if (item) {
                appliedGroups++;
                return {
                  ...g,
                  ...item.patch,
                  options: { ...g.options, ...(item.patch.options || {}) },
                };
              }
              return g;
            })
          );
        }

        // Apply group deletions
        if (plan.deleteGroups && plan.deleteGroups.length > 0) {
          const delSet = new Set(plan.deleteGroups);
          setDraftPolicyGroups((prev) =>
            prev.filter((g) => !delSet.has(g.id) && !delSet.has(g.name))
          );
        }

        // Apply rule additions
        if (plan.addRules && plan.addRules.length > 0) {
          const newRules: RoutingRule[] = plan.addRules.map((r, i) => ({
            id: `rule-agent-${Date.now()}-${i}`,
            ruleType: r.ruleType,
            pattern: r.pattern,
            targetPolicy: r.targetPolicy,
            options: r.options || [],
            rawLineIndex: -1,
          }));
          setDraftRules((prev) => [...prev, ...newRules]);
          appliedRules += newRules.length;
        }

        // Apply rule updates
        if (plan.updateRules && plan.updateRules.length > 0) {
          setDraftRules((prev) =>
            prev.map((r) => {
              const patchItem = plan.updateRules!.find(
                (u) => u.ruleId === r.id || (u.pattern && r.pattern === u.pattern)
              );
              if (patchItem) {
                appliedRules++;
                return { ...r, ...patchItem.patch };
              }
              return r;
            })
          );
        }

        // Apply rule deletions
        if (plan.deleteRules && plan.deleteRules.length > 0) {
          setDraftRules((prev) =>
            prev.filter((r) => {
              const matched = plan.deleteRules!.some(
                (d) => d.ruleId === r.id || (d.pattern && r.pattern === d.pattern)
              );
              return !matched;
            })
          );
        }

        // Orchestrate UI focuses
        if (plan.focusGroupName) {
          handleFocusGroup(plan.focusGroupName);
        }
        if (plan.focusRuleId) {
          handleNavigateToRule(plan.focusRuleId);
        }

        // Review modal trigger
        if (plan.openReviewModal) {
          setIsChangesModalOpen(true);
        }

        // Show Agent Toast
        const toastMsg = plan.message || `AI Agent 已成功注入策略变更`;
        setAgentToast({
          id: `toast-${Date.now()}`,
          message: toastMsg,
          addedGroupsCount: plan.addGroups?.length,
          updatedGroupsCount: plan.updateGroups?.length,
          addedRulesCount: plan.addRules?.length,
          updatedRulesCount: plan.updateRules?.length,
        });

        return {
          success: true,
          appliedGroupsCount: appliedGroups,
          appliedRulesCount: appliedRules,
          message: toastMsg,
        };
      },
    };

    window.__SURGE_WORKSPACE__ = api;

    return () => {
      delete window.__SURGE_WORKSPACE__;
    };
  }, [
    fileName,
    isDemo,
    rawText,
    modifiedText,
    diff,
    changeCount,
    draftPolicyGroups,
    draftRules,
    loadProfileText,
    handleResetDraft,
    handleAddGroup,
    handleUpdateGroup,
    handleDeleteGroup,
    handleAddRule,
    handleUpdateRule,
    handleDeleteRule,
    handleFocusGroup,
    handleNavigateToRule,
  ]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#fbfbfa]">
      {/* Drag & Drop Visual Overlay */}
      <DragDropOverlay isVisible={isDraggingOver} />

      {/* Agent Toast Notification Floating in Top-Right */}
      <AgentToast
        toast={agentToast}
        onClose={() => setAgentToast(null)}
        onOpenDiff={() => setIsChangesModalOpen(true)}
      />

      {/* Top Header */}
      <Header
        fileName={fileName}
        isDemo={isDemo}
        hasChanges={diff.hasChanges}
        changeCount={changeCount}
        isSwapped={isSwapped}
        onSwapLayout={() => setIsSwapped((prev) => !prev)}
        onLoadFile={(name, content) => loadProfileText(name, content, false)}
        onOpenPasteModal={() => setIsPasteModalOpen(true)}
        onLoadDemo={() => loadProfileText('Surge-Peng.conf (Demo)', DEMO_SURGE_CONFIG, true)}
        onResetDraft={handleResetDraft}
        onOpenChanges={() => setIsChangesModalOpen(true)}
      />

      {/* Main Dual Table Split Workspace */}
      <ResizableSplit
        isSwapped={isSwapped}
        left={
          <PolicyGroupTable
            groups={draftPolicyGroups}
            originalGroups={originalProfile?.policyGroups || []}
            rules={draftRules}
            originalRules={originalProfile?.rules || []}
            activeRuleFilterGroup={activeRuleFilterGroup}
            agentHighlightedGroupName={agentHighlightedGroupName}
            onFilterRulesByGroup={(name) => setActiveRuleFilterGroup(name)}
            onUpdateGroup={handleUpdateGroup}
            onAddGroup={handleAddGroup}
            onDeleteGroup={handleDeleteGroup}
            onOpenGroupDetail={(g) => setActiveGroupDetail(g)}
            onNavigateToRule={handleNavigateToRule}
            onToggleRuleRelation={handleToggleRuleRelation}
            onUnlinkRule={handleUnlinkRule}
            onRevertGroupRules={handleRevertGroupRules}
          />
        }
        right={
          <RoutingRulesTable
            rules={draftRules}
            policyGroups={draftPolicyGroups}
            activeFilterGroup={activeRuleFilterGroup}
            targetHighlightedRuleId={highlightedRuleId}
            onClearGroupFilter={() => setActiveRuleFilterGroup(null)}
            onUpdateRulesOrder={handleUpdateRulesOrder}
            onUpdateRule={handleUpdateRule}
            onAddRule={handleAddRule}
            onDeleteRule={handleDeleteRule}
          />
        }
      />

      {/* Group Detail Settings Drawer (Side Peek) */}
      <GroupDetailDrawer
        group={activeGroupDetail}
        onClose={() => setActiveGroupDetail(null)}
        onSave={(updated) => handleUpdateGroup(updated, activeGroupDetail?.name)}
      />

      {/* Changes & Export Modal */}
      <ChangesModal
        isOpen={isChangesModalOpen}
        onClose={() => setIsChangesModalOpen(false)}
        diff={diff}
        fileName={fileName.replace(' (Demo)', '')}
      />

      {/* Full Paste Config Modal */}
      <PasteConfigModal
        isOpen={isPasteModalOpen}
        onClose={() => setIsPasteModalOpen(false)}
        onConfirm={(content, name) => loadProfileText(name || 'Surge-Peng.conf', content, false)}
      />
    </div>
  );
};
