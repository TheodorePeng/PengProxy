import React, { useState, useMemo, useEffect } from 'react';
import { PolicyGroup, RoutingRule } from '@/types/surge';
import { MemberMultiSelectPopover } from './MemberMultiSelectPopover';
import { RelationMultiSelectPopover } from './RelationMultiSelectPopover';
import { SpeedTestPopover } from './SpeedTestPopover';
import { TableHeaderResizeHandle } from './TableHeaderResizeHandle';
import { useResizableColumns, ColumnConfig } from '@/hooks/useResizableColumns';
import { useColumnOrder } from '@/hooks/useColumnOrder';
import { formatRuleTitle, getRuleCategory, getCategoryBadgeStyle } from '@/lib/parser/rule-namer';
import {
  Search,
  Plus,
  Trash2,
  Settings2,
  Check,
  X,
  RotateCcw,
  Gauge,
  GripHorizontal,
} from 'lucide-react';

interface PolicyGroupTableProps {
  groups: PolicyGroup[];
  originalGroups: PolicyGroup[];
  rules: RoutingRule[];
  originalRules: RoutingRule[];
  activeRuleFilterGroup: string | null;
  agentHighlightedGroupName?: string | null;
  onFilterRulesByGroup: (groupName: string | null) => void;
  onUpdateGroup: (updatedGroup: PolicyGroup, oldName?: string) => void;
  onAddGroup: (newGroup: PolicyGroup) => void;
  onDeleteGroup: (groupId: string) => void;
  onOpenGroupDetail: (group: PolicyGroup) => void;
  onNavigateToRule: (ruleId: string) => void;
  onToggleRuleRelation: (ruleId: string, groupName: string) => void;
  onUnlinkRule: (ruleId: string) => void;
  onRevertGroupRules: (groupName: string) => void;
}

const DEFAULT_COLUMNS = [
  'name',
  'type',
  'relation',
  'members',
  'regexFilter',
  'speedTest',
  'actions',
];

const COLUMN_TITLES: Record<string, string> = {
  name: '策略组名称 (Name)',
  type: '类型 (Type)',
  relation: '关联规则 (Relation)',
  members: '成员与外部来源 (Members)',
  regexFilter: '节点正则 (Regex Filter)',
  speedTest: '测速参数 (Speed Test)',
  actions: '操作',
};

const COLUMN_CONFIGS: Record<string, ColumnConfig> = {
  name: { initialWidth: 160, minWidth: 100 },
  type: { initialWidth: 95, minWidth: 75 },
  relation: { initialWidth: 200, minWidth: 120 },
  members: { initialWidth: 220, minWidth: 130 },
  regexFilter: { initialWidth: 150, minWidth: 90 },
  speedTest: { initialWidth: 135, minWidth: 80 },
  actions: { initialWidth: 65, minWidth: 50 },
};

export const PolicyGroupTable: React.FC<PolicyGroupTableProps> = ({
  groups,
  originalGroups,
  rules,
  originalRules,
  activeRuleFilterGroup,
  agentHighlightedGroupName = null,
  onFilterRulesByGroup,
  onUpdateGroup,
  onAddGroup,
  onDeleteGroup,
  onOpenGroupDetail,
  onNavigateToRule,
  onToggleRuleRelation,
  onUnlinkRule,
  onRevertGroupRules,
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Auto-scroll to highlighted group when agent focuses it
  useEffect(() => {
    if (agentHighlightedGroupName) {
      const el = document.getElementById(`group-row-${agentHighlightedGroupName}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [agentHighlightedGroupName]);

  // Inline rename
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');

  // Inline regex editing
  const [editingRegexGroupId, setEditingRegexGroupId] = useState<string | null>(null);
  const [tempRegex, setTempRegex] = useState('');

  // Resizable columns hook
  const { widths, startResizing, resetColumn } = useResizableColumns(COLUMN_CONFIGS);

  // Column order drag & drop hook
  const {
    columnOrder,
    dragOverColumnId,
    isPinned,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
  } = useColumnOrder({
    defaultColumns: DEFAULT_COLUMNS,
    storageKey: 'surge_workspace_policy_columns_v2',
    pinnedStart: ['name'],
    pinnedEnd: ['actions'],
  });

  // Popover states
  const [memberPopoverGroup, setMemberPopoverGroup] = useState<PolicyGroup | null>(null);
  const [memberPopoverAnchorRect, setMemberPopoverAnchorRect] = useState<DOMRect | null>(null);

  const [relationPopoverGroup, setRelationPopoverGroup] = useState<PolicyGroup | null>(null);
  const [relationPopoverAnchorRect, setRelationPopoverAnchorRect] = useState<DOMRect | null>(null);

  const [speedPopoverGroup, setSpeedPopoverGroup] = useState<PolicyGroup | null>(null);
  const [speedPopoverAnchorRect, setSpeedPopoverAnchorRect] = useState<DOMRect | null>(null);

  // Map of groupName -> list of rules that target it
  const rulesByGroupMap = useMemo(() => {
    const map = new Map<string, RoutingRule[]>();
    for (const r of rules) {
      if (r.targetPolicy) {
        const list = map.get(r.targetPolicy) || [];
        list.push(r);
        map.set(r.targetPolicy, list);
      }
    }
    return map;
  }, [rules]);

  // Collect all known group names
  const allGroupNames = useMemo(() => groups.map((g) => g.name), [groups]);

  // Collect all known proxy node names across the profile
  const knownNodes = useMemo(() => {
    const nodeSet = new Set<string>(['DIRECT', 'REJECT', 'REJECT-DROP']);
    const groupNameSet = new Set<string>(groups.map((g) => g.name));

    for (const g of groups) {
      for (const m of g.members) {
        if (!groupNameSet.has(m)) {
          nodeSet.add(m);
        }
      }
    }
    return Array.from(nodeSet);
  }, [groups]);

  // Filter groups
  const filteredGroups = useMemo(() => {
    return groups.filter((g) => {
      const matchSearch =
        !search ||
        g.name.toLowerCase().includes(search.toLowerCase()) ||
        g.members.some((m) => m.toLowerCase().includes(search.toLowerCase())) ||
        (g.options['policy-regex-filter'] &&
          g.options['policy-regex-filter'].toLowerCase().includes(search.toLowerCase()));
      const matchType = typeFilter === 'ALL' || g.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [groups, search, typeFilter]);

  // Modification detectors
  const isGroupMembersModified = (g: PolicyGroup) => {
    const orig = originalGroups.find((item) => item.id === g.id);
    if (!orig) return false;
    const origMembers = orig.members.join(',');
    const currMembers = g.members.join(',');
    const origInclude = orig.options['include-other-group'] || '';
    const currInclude = g.options['include-other-group'] || '';
    return origMembers !== currMembers || origInclude !== currInclude;
  };

  const isGroupRelationModified = (groupName: string) => {
    const origRules = originalRules.filter((r) => r.targetPolicy === groupName);
    const currRules = rules.filter((r) => r.targetPolicy === groupName);
    if (origRules.length !== currRules.length) return true;
    const origIds = new Set(origRules.map((r) => r.id));
    return currRules.some((r) => !origIds.has(r.id));
  };

  const isGroupRegexModified = (g: PolicyGroup) => {
    const orig = originalGroups.find((item) => item.id === g.id);
    if (!orig) return false;
    return (orig.options['policy-regex-filter'] || '') !== (g.options['policy-regex-filter'] || '');
  };

  const isGroupSpeedTestModified = (g: PolicyGroup) => {
    const orig = originalGroups.find((item) => item.id === g.id);
    if (!orig) return false;
    return (
      (orig.options.interval || '') !== (g.options.interval || '') ||
      (orig.options.tolerance || '') !== (g.options.tolerance || '') ||
      (orig.options.url || '') !== (g.options.url || '')
    );
  };

  // Revert handlers
  const handleRevertMembers = (g: PolicyGroup) => {
    const orig = originalGroups.find((item) => item.id === g.id);
    if (!orig) return;
    const updatedOptions = { ...g.options };
    if (orig.options['include-other-group']) {
      updatedOptions['include-other-group'] = orig.options['include-other-group'];
    } else {
      delete updatedOptions['include-other-group'];
    }
    onUpdateGroup({ ...g, members: [...orig.members], options: updatedOptions });
  };

  const handleRevertRegex = (g: PolicyGroup) => {
    const orig = originalGroups.find((item) => item.id === g.id);
    if (!orig) return;
    const updatedOptions = { ...g.options };
    if (orig.options['policy-regex-filter']) {
      updatedOptions['policy-regex-filter'] = orig.options['policy-regex-filter'];
    } else {
      delete updatedOptions['policy-regex-filter'];
    }
    onUpdateGroup({ ...g, options: updatedOptions });
  };

  const handleRevertSpeedTest = (g: PolicyGroup) => {
    const orig = originalGroups.find((item) => item.id === g.id);
    if (!orig) return;
    const updatedOptions = { ...g.options };
    if (orig.options.interval) updatedOptions.interval = orig.options.interval;
    else delete updatedOptions.interval;

    if (orig.options.tolerance) updatedOptions.tolerance = orig.options.tolerance;
    else delete updatedOptions.tolerance;

    if (orig.options.url) updatedOptions.url = orig.options.url;
    else delete updatedOptions.url;

    onUpdateGroup({ ...g, options: updatedOptions });
  };

  // Inline rename handlers
  const handleStartRename = (g: PolicyGroup) => {
    setEditingNameId(g.id);
    setTempName(g.name);
  };

  const handleSaveRename = (g: PolicyGroup) => {
    const newName = tempName.trim();
    if (newName && newName !== g.name) {
      onUpdateGroup({ ...g, name: newName }, g.name);
    }
    setEditingNameId(null);
  };

  // Inline regex handlers
  const handleStartRegexEdit = (g: PolicyGroup) => {
    setEditingRegexGroupId(g.id);
    setTempRegex(g.options['policy-regex-filter'] || '');
  };

  const handleSaveRegexEdit = (g: PolicyGroup) => {
    const trimmed = tempRegex.trim();
    const updatedOptions = { ...g.options };
    if (trimmed) {
      updatedOptions['policy-regex-filter'] = trimmed;
    } else {
      delete updatedOptions['policy-regex-filter'];
    }
    onUpdateGroup({ ...g, options: updatedOptions });
    setEditingRegexGroupId(null);
  };

  // Popover openers
  const handleOpenMemberPopover = (e: React.MouseEvent, g: PolicyGroup) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setMemberPopoverAnchorRect(rect);
    setMemberPopoverGroup(g);
  };

  const handleOpenRelationPopover = (e: React.MouseEvent, g: PolicyGroup) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setRelationPopoverAnchorRect(rect);
    setRelationPopoverGroup(g);
  };

  const handleOpenSpeedPopover = (e: React.MouseEvent, g: PolicyGroup) => {
    e.stopPropagation();
    if (g.type === 'select') return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setSpeedPopoverAnchorRect(rect);
    setSpeedPopoverGroup(g);
  };

  // Handle speed test save from popover
  const handleSaveSpeedTestFromPopover = (
    interval?: string,
    tolerance?: string,
    url?: string
  ) => {
    if (!speedPopoverGroup) return;
    const updatedOptions = { ...speedPopoverGroup.options };
    if (interval) updatedOptions.interval = interval;
    else delete updatedOptions.interval;

    if (tolerance) updatedOptions.tolerance = tolerance;
    else delete updatedOptions.tolerance;

    if (url) updatedOptions.url = url;
    else delete updatedOptions.url;

    onUpdateGroup({ ...speedPopoverGroup, options: updatedOptions });
  };

  const handleTypeChange = (g: PolicyGroup, newType: string) => {
    onUpdateGroup({ ...g, type: newType });
  };

  const handleRemoveMember = (g: PolicyGroup, memberToRemove: string) => {
    const updated = {
      ...g,
      members: g.members.filter((m) => m !== memberToRemove),
    };
    onUpdateGroup(updated);
  };

  const handleAddNew = () => {
    const newGroup: PolicyGroup = {
      id: `group-new-${Date.now()}`,
      name: `New-Group-${groups.length + 1}`,
      type: 'select',
      members: ['DIRECT'],
      options: {},
      rawLineIndex: -1,
    };
    onAddGroup(newGroup);
  };

  const totalTableWidth = columnOrder.reduce(
    (sum, colKey) => sum + (widths[colKey] || COLUMN_CONFIGS[colKey]?.initialWidth || 120),
    0
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none border-r border-[#e9e9e7]">
      {/* Table Toolbar */}
      <div className="p-3 border-b border-[#e9e9e7] flex items-center justify-between gap-2 bg-[#fcfcfb]">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs tracking-wide text-neutral-800 uppercase flex items-center gap-1.5">
            <span>🛡️ 策略组 (Policy Groups)</span>
            <span className="text-[11px] font-normal text-neutral-500 bg-neutral-100 px-1.5 py-0.2 rounded-md">
              {filteredGroups.length} / {groups.length}
            </span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索策略组/节点/正则..."
              className="h-7 w-36 focus:w-48 pl-8 pr-2 text-xs rounded-md border border-neutral-200 bg-white focus:outline-indigo-500 transition-all text-neutral-700"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-7 px-2 text-xs rounded-md border border-neutral-200 bg-white text-neutral-700 focus:outline-indigo-500"
          >
            <option value="ALL">全部类型</option>
            <option value="select">select</option>
            <option value="url-test">url-test</option>
            <option value="fallback">fallback</option>
            <option value="load-balance">load-balance</option>
          </select>

          <button
            onClick={handleAddNew}
            className="h-7 px-2 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>新建策略组</span>
          </button>
        </div>
      </div>

      {/* Notion Policy Groups Table with Column Drag Reordering & Resizing */}
      <div className="flex-1 overflow-auto">
        <table
          style={{ width: `${totalTableWidth}px`, minWidth: '100%' }}
          className="text-left border-collapse text-xs table-fixed"
        >
          <thead>
            <tr className="border-b border-[#e9e9e7] text-neutral-500 bg-[#fbfbfa] sticky top-0 z-10 font-medium">
              {columnOrder.map((colKey) => {
                const colWidth = widths[colKey] || COLUMN_CONFIGS[colKey]?.initialWidth || 120;
                const isColPinned = isPinned(colKey);
                const isOver = dragOverColumnId === colKey;

                return (
                  <th
                    key={colKey}
                    style={{ width: `${colWidth}px` }}
                    draggable={!isColPinned}
                    onDragStart={(e) => handleDragStart(colKey, e)}
                    onDragOver={(e) => handleDragOver(colKey, e)}
                    onDrop={(e) => handleDrop(colKey, e)}
                    onDragEnd={handleDragEnd}
                    className={`py-2 px-2.5 font-medium relative group/th transition-colors ${
                      isColPinned ? '' : 'cursor-grab active:cursor-grabbing hover:bg-neutral-100/70'
                    } ${isOver ? 'border-l-2 border-indigo-500 bg-indigo-50/50' : ''}`}
                    title={
                      isColPinned
                        ? `${COLUMN_TITLES[colKey]} (固定首尾列)`
                        : `${COLUMN_TITLES[colKey]}\n(按住表头可拖拽调整列顺序，双击右侧把手复位宽度)`
                    }
                  >
                    <div className="flex items-center gap-1 truncate">
                      {!isColPinned && (
                        <GripHorizontal className="w-2.5 h-2.5 text-neutral-300 opacity-0 group-hover/th:opacity-100 shrink-0 transition-opacity" />
                      )}
                      <span className="truncate block">{COLUMN_TITLES[colKey]}</span>
                    </div>

                    <TableHeaderResizeHandle
                      onResizeStart={(e) => startResizing(colKey, e)}
                      onReset={() => resetColumn(colKey)}
                    />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0f0ee]">
            {filteredGroups.length === 0 ? (
              <tr>
                <td colSpan={columnOrder.length} className="py-12 text-center text-neutral-400">
                  没有匹配的策略组
                </td>
              </tr>
            ) : (
              filteredGroups.map((g) => {
                const linkedRules = rulesByGroupMap.get(g.name) || [];
                const isFilterActive = activeRuleFilterGroup === g.name;
                const isMembersModified = isGroupMembersModified(g);
                const isRelationModified = isGroupRelationModified(g.name);
                const isRegexModified = isGroupRegexModified(g);
                const isSpeedModified = isGroupSpeedTestModified(g);

                const isAgentHighlighted = agentHighlightedGroupName === g.name;

                return (
                  <tr
                    key={g.id}
                    id={`group-row-${g.name}`}
                    data-agent-group={g.name}
                    className={`group transition-all duration-300 ${
                      isAgentHighlighted
                        ? 'bg-purple-100/90 ring-2 ring-purple-500 ring-inset shadow-md font-medium'
                        : isFilterActive
                        ? 'bg-indigo-50/70'
                        : 'hover:bg-[#f9f9f8]'
                    }`}
                  >
                    {columnOrder.map((colKey) => {
                      const colWidth = widths[colKey] || COLUMN_CONFIGS[colKey]?.initialWidth || 120;

                      // 1. Name Column
                      if (colKey === 'name') {
                        return (
                          <td
                            key="name"
                            style={{ width: `${colWidth}px`, maxWidth: `${colWidth}px` }}
                            className="py-2 px-3 truncate"
                          >
                            {editingNameId === g.id ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={tempName}
                                  onChange={(e) => setTempName(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleSaveRename(g)}
                                  className="h-6 px-1.5 text-xs border border-indigo-500 rounded bg-white w-full focus:outline-none"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleSaveRename(g)}
                                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => setEditingNameId(null)}
                                  className="p-1 text-neutral-400 hover:bg-neutral-100 rounded cursor-pointer"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div
                                onClick={() => handleStartRename(g)}
                                className="font-medium text-neutral-800 hover:text-indigo-600 cursor-pointer flex items-center gap-1.5 truncate"
                                title="点击修改策略组名称（将自动级联更新规则表）"
                              >
                                <span className="truncate">{g.name}</span>
                              </div>
                            )}
                          </td>
                        );
                      }

                      // 2. Type Column
                      if (colKey === 'type') {
                        return (
                          <td
                            key="type"
                            style={{ width: `${colWidth}px`, maxWidth: `${colWidth}px` }}
                            className="py-2 px-2 truncate"
                          >
                            <select
                              value={g.type}
                              onChange={(e) => handleTypeChange(g, e.target.value)}
                              className={`text-[11px] px-1.5 py-0.5 rounded font-medium border cursor-pointer focus:outline-none w-full truncate ${
                                g.type === 'url-test'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : g.type === 'fallback'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : g.type === 'load-balance'
                                  ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}
                            >
                              <option value="select">select</option>
                              <option value="url-test">url-test</option>
                              <option value="fallback">fallback</option>
                              <option value="load-balance">load-balance</option>
                            </select>
                          </td>
                        );
                      }

                      // 3. Relation Column (Moved up to 3rd position!)
                      if (colKey === 'relation') {
                        return (
                          <td
                            key="relation"
                            style={{ width: `${colWidth}px`, maxWidth: `${colWidth}px` }}
                            className="py-2 px-2"
                          >
                            <div className="flex items-center justify-between gap-1 group/rel">
                              <div
                                onClick={(e) => handleOpenRelationPopover(e, g)}
                                className="flex-1 flex flex-wrap items-center gap-1 min-h-[26px] p-1 rounded-md border border-transparent hover:border-neutral-200 hover:bg-neutral-50/80 transition-all cursor-pointer overflow-hidden"
                                title="点击打开关联多选面板，或点击单个规则胶囊平滑定位到右侧目标行"
                              >
                                {linkedRules.length === 0 ? (
                                  <span className="text-[11px] text-neutral-400 italic">未关联规则</span>
                                ) : (
                                  linkedRules.map((r) => {
                                    const rIdx = rules.findIndex((item) => item.id === r.id);
                                    const title = formatRuleTitle(r, rIdx);
                                    const cat = getRuleCategory(r.ruleType);

                                    return (
                                      <span
                                        key={r.id}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onNavigateToRule(r.id);
                                        }}
                                        className={`text-[10px] pl-1.5 pr-1 py-0.5 rounded-md border flex items-center gap-1 truncate max-w-[140px] group/tag transition-all shrink-0 hover:scale-102 hover:shadow-2xs ${getCategoryBadgeStyle(
                                          cat
                                        )}`}
                                        title={`点击定位右侧规则: ${title}\n条件: ${r.pattern}`}
                                      >
                                        <span className="truncate font-mono">{title}</span>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onUnlinkRule(r.id);
                                          }}
                                          className="p-0.5 hover:bg-black/10 rounded cursor-pointer text-neutral-500 hover:text-red-700"
                                          title={`解除规则 ${title} 与当前策略组的关联`}
                                        >
                                          <X className="w-2.5 h-2.5" />
                                        </button>
                                      </span>
                                    );
                                  })
                                )}

                                <span className="text-[10px] px-1.5 py-0.5 text-neutral-400 hover:text-indigo-600 bg-transparent hover:bg-indigo-50 border border-dashed border-transparent hover:border-indigo-300 rounded flex items-center gap-0.5 opacity-0 group-hover/rel:opacity-100 transition-opacity shrink-0">
                                  <Plus className="w-2.5 h-2.5" />
                                  <span>关联</span>
                                </span>
                              </div>

                              {isRelationModified ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onRevertGroupRules(g.name);
                                  }}
                                  className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-md shrink-0 transition-colors cursor-pointer border border-amber-200/60 shadow-2xs"
                                  title="一键还原为此策略组初始关联规则"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <div
                                  className="w-6 h-6 flex items-center justify-center shrink-0 opacity-0 group-hover/rel:opacity-20 text-neutral-400"
                                  title="当前关联规则与初始文件一致"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      }

                      // 4. Members Column
                      if (colKey === 'members') {
                        return (
                          <td
                            key="members"
                            style={{ width: `${colWidth}px`, maxWidth: `${colWidth}px` }}
                            className="py-2 px-2"
                          >
                            <div className="flex items-center justify-between gap-1 group/cell">
                              <div
                                onClick={(e) => handleOpenMemberPopover(e, g)}
                                className="flex-1 flex flex-wrap items-center gap-1 min-h-[26px] p-1 rounded-md border border-transparent hover:border-neutral-200 hover:bg-neutral-50/80 transition-all cursor-pointer overflow-hidden"
                                title="点击打开多选面板添加或修改成员"
                              >
                                {g.members.map((m, idx) => (
                                  <span
                                    key={idx}
                                    className="text-[10px] pl-1.5 pr-1 py-0.5 bg-neutral-100 hover:bg-neutral-200/80 text-neutral-700 rounded-md border border-neutral-200 flex items-center gap-1 truncate max-w-[150px] group/tag transition-colors shrink-0"
                                    title={m}
                                  >
                                    <span className="truncate">{m}</span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveMember(g, m);
                                      }}
                                      className="p-0.5 hover:bg-neutral-300 rounded text-neutral-400 hover:text-neutral-700 cursor-pointer"
                                      title={`移除 ${m}`}
                                    >
                                      <X className="w-2.5 h-2.5" />
                                    </button>
                                  </span>
                                ))}

                                {g.options['include-other-group'] && (
                                  <span
                                    className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-md border border-emerald-200 truncate max-w-[140px] shrink-0"
                                    title={`外部引用组: ${g.options['include-other-group']}`}
                                  >
                                    +{g.options['include-other-group']}
                                  </span>
                                )}

                                <span className="text-[10px] px-1.5 py-0.5 text-neutral-400 hover:text-indigo-600 bg-transparent hover:bg-indigo-50 border border-dashed border-transparent hover:border-indigo-300 rounded flex items-center gap-0.5 opacity-0 group-hover/cell:opacity-100 transition-opacity shrink-0">
                                  <Plus className="w-2.5 h-2.5" />
                                  <span>添加</span>
                                </span>
                              </div>

                              {isMembersModified ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRevertMembers(g);
                                  }}
                                  className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-md shrink-0 transition-colors cursor-pointer border border-amber-200/60 shadow-2xs"
                                  title="一键还原为此策略组初始成员配置"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <div
                                  className="w-6 h-6 flex items-center justify-center shrink-0 opacity-0 group-hover/cell:opacity-20 text-neutral-400"
                                  title="当前成员配置与初始文件一致"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      }

                      // 5. Regex Filter Column (NEW)
                      if (colKey === 'regexFilter') {
                        const regexVal = g.options['policy-regex-filter'];
                        const isEditingRegex = editingRegexGroupId === g.id;

                        return (
                          <td
                            key="regexFilter"
                            style={{ width: `${colWidth}px`, maxWidth: `${colWidth}px` }}
                            className="py-2 px-2"
                          >
                            <div className="flex items-center justify-between gap-1 group/regex">
                              {isEditingRegex ? (
                                <div className="flex-1 flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={tempRegex}
                                    onChange={(e) => setTempRegex(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveRegexEdit(g);
                                      if (e.key === 'Escape') setEditingRegexGroupId(null);
                                    }}
                                    onBlur={() => handleSaveRegexEdit(g)}
                                    placeholder="如 ^🇭🇰|^🇯🇵"
                                    className="h-6 px-1.5 text-[11px] font-mono border border-indigo-500 rounded bg-white w-full focus:outline-none"
                                    autoFocus
                                  />
                                </div>
                              ) : (
                                <div
                                  onClick={() => handleStartRegexEdit(g)}
                                  className="flex-1 min-h-[24px] flex items-center cursor-pointer truncate"
                                  title={
                                    regexVal
                                      ? `节点正则筛选: ${regexVal} (点击编辑)`
                                      : '未设置节点正则 (点击添加)'
                                  }
                                >
                                  {regexVal ? (
                                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 truncate max-w-full">
                                      {regexVal}
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-neutral-300 group-hover/regex:text-neutral-500 italic">
                                      + 正则筛选
                                    </span>
                                  )}
                                </div>
                              )}

                              {isRegexModified ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRevertRegex(g);
                                  }}
                                  className="p-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded shrink-0 transition-colors cursor-pointer border border-amber-200/60 shadow-2xs"
                                  title="一键还原节点正则"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <div className="w-5 h-5 shrink-0" />
                              )}
                            </div>
                          </td>
                        );
                      }

                      // 6. Speed Test Parameters Column (NEW)
                      if (colKey === 'speedTest') {
                        const isApplicable = g.type !== 'select';
                        const interval = g.options.interval;
                        const tolerance = g.options.tolerance;
                        const hasParams = !!interval || !!tolerance;

                        return (
                          <td
                            key="speedTest"
                            style={{ width: `${colWidth}px`, maxWidth: `${colWidth}px` }}
                            className="py-2 px-2"
                          >
                            <div className="flex items-center justify-between gap-1 group/speed">
                              {isApplicable ? (
                                <div
                                  onClick={(e) => handleOpenSpeedPopover(e, g)}
                                  className="flex-1 min-h-[24px] flex items-center cursor-pointer truncate"
                                  title={
                                    hasParams
                                      ? `测速间隔: ${interval || '600'}s · 容差: ${
                                          tolerance || '50'
                                        }ms (点击微调)`
                                      : '默认测速参数 (点击微调)'
                                  }
                                >
                                  <span
                                    className={`text-[10px] px-1.5 py-0.5 rounded border inline-flex items-center gap-1 font-mono truncate ${
                                      hasParams
                                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-medium'
                                        : 'bg-neutral-50 text-neutral-500 border-neutral-200 hover:bg-neutral-100'
                                    }`}
                                  >
                                    <Gauge className="w-2.5 h-2.5 shrink-0" />
                                    <span className="truncate">
                                      {interval ? `${interval}s` : '600s'} ·{' '}
                                      {tolerance ? `${tolerance}ms` : '50ms'}
                                    </span>
                                  </span>
                                </div>
                              ) : (
                                <span className="text-neutral-300 italic text-[11px]">-</span>
                              )}

                              {isSpeedModified ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRevertSpeedTest(g);
                                  }}
                                  className="p-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded shrink-0 transition-colors cursor-pointer border border-amber-200/60 shadow-2xs"
                                  title="一键还原测速与容差参数"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <div className="w-5 h-5 shrink-0" />
                              )}
                            </div>
                          </td>
                        );
                      }

                      // 7. Actions Column
                      if (colKey === 'actions') {
                        return (
                          <td
                            key="actions"
                            style={{ width: `${colWidth}px`, maxWidth: `${colWidth}px` }}
                            className="py-2 px-2 text-right truncate"
                          >
                            <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => onOpenGroupDetail(g)}
                                title="配置高级参数 (容差/测速/正则/外部订阅)"
                                className="p-1 text-neutral-500 hover:text-indigo-600 hover:bg-neutral-100 rounded cursor-pointer"
                              >
                                <Settings2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onDeleteGroup(g.id)}
                                title="删除此策略组"
                                className="p-1 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        );
                      }

                      return null;
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Member Multi-Select Popover */}
      {memberPopoverGroup && (
        <MemberMultiSelectPopover
          isOpen={!!memberPopoverGroup}
          onClose={() => setMemberPopoverGroup(null)}
          anchorRect={memberPopoverAnchorRect}
          group={memberPopoverGroup}
          allGroupNames={allGroupNames}
          knownNodes={knownNodes}
          onToggleMember={(name) => {
            const exists = memberPopoverGroup.members.includes(name);
            const updated = {
              ...memberPopoverGroup,
              members: exists
                ? memberPopoverGroup.members.filter((m) => m !== name)
                : [...memberPopoverGroup.members, name],
            };
            setMemberPopoverGroup(updated);
            onUpdateGroup(updated);
          }}
          onAddMember={(newM) => {
            if (!memberPopoverGroup.members.includes(newM)) {
              const updated = {
                ...memberPopoverGroup,
                members: [...memberPopoverGroup.members, newM],
              };
              setMemberPopoverGroup(updated);
              onUpdateGroup(updated);
            }
          }}
          onUpdateIncludeOtherGroup={(val) => {
            const updatedOpts = { ...memberPopoverGroup.options };
            if (val) updatedOpts['include-other-group'] = val;
            else delete updatedOpts['include-other-group'];
            const updated = { ...memberPopoverGroup, options: updatedOpts };
            setMemberPopoverGroup(updated);
            onUpdateGroup(updated);
          }}
        />
      )}

      {/* Relation Multi-Select Popover */}
      {relationPopoverGroup && (
        <RelationMultiSelectPopover
          isOpen={!!relationPopoverGroup}
          onClose={() => setRelationPopoverGroup(null)}
          anchorRect={relationPopoverAnchorRect}
          group={relationPopoverGroup}
          allRules={rules}
          onToggleRuleRelation={onToggleRuleRelation}
        />
      )}

      {/* Speed Test Popover */}
      {speedPopoverGroup && (
        <SpeedTestPopover
          isOpen={!!speedPopoverGroup}
          onClose={() => setSpeedPopoverGroup(null)}
          anchorRect={speedPopoverAnchorRect}
          group={speedPopoverGroup}
          onSave={handleSaveSpeedTestFromPopover}
        />
      )}
    </div>
  );
};
