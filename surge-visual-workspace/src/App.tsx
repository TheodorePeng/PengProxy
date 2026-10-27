import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ParsedProfile, PolicyGroup, RoutingRule } from '@/types/surge';
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

  const handleResetDraft = () => {
    if (!originalProfile) return;
    setDraftPolicyGroups(originalProfile.policyGroups);
    setDraftRules(originalProfile.rules);
    setActiveRuleFilterGroup(null);
  };

  // Group mutations
  const handleUpdateGroup = (updatedGroup: PolicyGroup, oldName?: string) => {
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
  };

  const handleAddGroup = (newGroup: PolicyGroup) => {
    setDraftPolicyGroups((prev) => [...prev, newGroup]);
  };

  const handleDeleteGroup = (groupId: string) => {
    setDraftPolicyGroups((prev) => prev.filter((g) => g.id !== groupId));
  };

  // Rule mutations
  const handleUpdateRulesOrder = (reorderedRules: RoutingRule[]) => {
    setDraftRules(reorderedRules);
  };

  const handleUpdateRule = (updatedRule: RoutingRule) => {
    setDraftRules((prev) =>
      prev.map((r) => (r.id === updatedRule.id ? updatedRule : r))
    );
  };

  const handleAddRule = (newRule: RoutingRule) => {
    setDraftRules((prev) => [...prev, newRule]);
  };

  const handleDeleteRule = (ruleId: string) => {
    setDraftRules((prev) => prev.filter((r) => r.id !== ruleId));
  };

  // Cross-table jump & highlight navigation
  const handleNavigateToRule = (ruleId: string) => {
    setActiveRuleFilterGroup(null); // Clear group filter so target rule is guaranteed visible
    setHighlightedRuleId(ruleId);
    setTimeout(() => {
      setHighlightedRuleId((curr) => (curr === ruleId ? null : curr));
    }, 2500);
  };

  // Relation toggle
  const handleToggleRuleRelation = (ruleId: string, groupName: string) => {
    setDraftRules((prev) =>
      prev.map((r) => {
        if (r.id !== ruleId) return r;
        const newTarget = r.targetPolicy === groupName ? 'DIRECT' : groupName;
        return { ...r, targetPolicy: newTarget };
      })
    );
  };

  // Unlink single rule
  const handleUnlinkRule = (ruleId: string) => {
    setDraftRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, targetPolicy: 'DIRECT' } : r))
    );
  };

  // Single-cell revert relation for group
  const handleRevertGroupRules = (groupName: string) => {
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
  };

  // Compute live diff
  const modifiedText = useMemo(() => {
    if (!originalProfile) return '';
    return serializeSurgeProfile(originalProfile, draftPolicyGroups, draftRules);
  }, [originalProfile, draftPolicyGroups, draftRules]);

  const diff = useMemo(() => {
    return computeProfileDiff(rawText, modifiedText);
  }, [rawText, modifiedText]);

  const changeCount = diff.summary.addedLines + diff.summary.removedLines;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#fbfbfa]">
      {/* Drag & Drop Visual Overlay */}
      <DragDropOverlay isVisible={isDraggingOver} />

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
