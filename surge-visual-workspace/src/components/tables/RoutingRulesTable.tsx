import React, { useState, useMemo, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { RoutingRule, PolicyGroup } from '@/types/surge';
import { SortableRuleRow } from './RuleRowDragHandle';
import { formatRuleTitle } from '@/lib/parser/rule-namer';
import { TableHeaderResizeHandle } from './TableHeaderResizeHandle';
import { useResizableColumns, ColumnConfig } from '@/hooks/useResizableColumns';
import { useColumnOrder } from '@/hooks/useColumnOrder';
import { Search, Plus, X, GripHorizontal } from 'lucide-react';

interface RoutingRulesTableProps {
  rules: RoutingRule[];
  policyGroups: PolicyGroup[];
  activeFilterGroup: string | null;
  targetHighlightedRuleId?: string | null;
  onClearGroupFilter: () => void;
  onUpdateRulesOrder: (reorderedRules: RoutingRule[]) => void;
  onUpdateRule: (updatedRule: RoutingRule) => void;
  onAddRule: (newRule: RoutingRule) => void;
  onDeleteRule: (ruleId: string) => void;
}

const DEFAULT_COLUMNS = [
  'grip',
  'ruleName',
  'targetPolicy',
  'ruleType',
  'pattern',
  'actions',
];

const COLUMN_TITLES: Record<string, string> = {
  grip: '',
  ruleName: '规则标识 (Rule Name)',
  targetPolicy: '目标策略组 (Target Policy)',
  ruleType: '类型 (Type)',
  pattern: '匹配条件 (Pattern)',
  actions: '操作',
};

const COLUMN_CONFIGS: Record<string, ColumnConfig> = {
  grip: { initialWidth: 32, minWidth: 28, maxWidth: 40 },
  ruleName: { initialWidth: 180, minWidth: 120 },
  targetPolicy: { initialWidth: 170, minWidth: 100 },
  ruleType: { initialWidth: 110, minWidth: 80 },
  pattern: { initialWidth: 240, minWidth: 120 },
  actions: { initialWidth: 55, minWidth: 45 },
};

export const RoutingRulesTable: React.FC<RoutingRulesTableProps> = ({
  rules,
  policyGroups,
  activeFilterGroup,
  targetHighlightedRuleId = null,
  onClearGroupFilter,
  onUpdateRulesOrder,
  onUpdateRule,
  onAddRule,
  onDeleteRule,
}) => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Resizable columns hook
  const { widths, startResizing, resetColumn } = useResizableColumns(COLUMN_CONFIGS);

  // Column order hook
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
    storageKey: 'surge_workspace_rules_columns_v2',
    pinnedStart: ['grip', 'ruleName'],
    pinnedEnd: ['actions'],
  });

  // Auto-scroll to highlighted rule when clicked from Relation column
  useEffect(() => {
    if (targetHighlightedRuleId) {
      const el = document.getElementById(`rule-row-${targetHighlightedRuleId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [targetHighlightedRuleId]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const availablePolicies = useMemo(() => {
    return policyGroups.map((g) => g.name);
  }, [policyGroups]);

  // Filter rules
  const filteredRules = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rules.filter((r) => {
      const originalIdx = rules.findIndex((item) => item.id === r.id);
      const ruleTitle = formatRuleTitle(r, originalIdx).toLowerCase();

      const matchSearch =
        !q ||
        r.pattern.toLowerCase().includes(q) ||
        r.targetPolicy.toLowerCase().includes(q) ||
        r.ruleType.toLowerCase().includes(q) ||
        ruleTitle.includes(q);

      const matchType = typeFilter === 'ALL' || r.ruleType === typeFilter;
      const matchGroup = !activeFilterGroup || r.targetPolicy === activeFilterGroup;
      return matchSearch && matchType && matchGroup;
    });
  }, [rules, search, typeFilter, activeFilterGroup]);

  const handleDragEndRow = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = rules.findIndex((r) => r.id === active.id);
      const newIndex = rules.findIndex((r) => r.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(rules, oldIndex, newIndex);
        onUpdateRulesOrder(reordered);
      }
    }
  };

  const handleAddNew = () => {
    const newRule: RoutingRule = {
      id: `rule-new-${Date.now()}`,
      ruleType: 'DOMAIN-SUFFIX',
      pattern: 'example.com',
      targetPolicy: availablePolicies[0] || 'DIRECT',
      options: [],
      rawLineIndex: -1,
    };
    onAddRule(newRule);
  };

  const totalTableWidth = columnOrder.reduce(
    (sum, colKey) => sum + (widths[colKey] || COLUMN_CONFIGS[colKey]?.initialWidth || 120),
    0
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-white select-none">
      {/* Table Toolbar */}
      <div className="p-3 border-b border-[#e9e9e7] flex items-center justify-between gap-2 bg-[#fcfcfb]">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-xs tracking-wide text-neutral-800 uppercase flex items-center gap-1.5">
            <span>🔀 分流规则 (Routing Rules)</span>
            <span className="text-[11px] font-normal text-neutral-500 bg-neutral-100 px-1.5 py-0.2 rounded-md">
              {filteredRules.length} / {rules.length}
            </span>
          </span>

          {activeFilterGroup && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-medium">
              <span>过滤: {activeFilterGroup}</span>
              <button
                onClick={onClearGroupFilter}
                className="hover:bg-indigo-200/60 rounded-full p-0.5 cursor-pointer"
                title="清除策略组联动过滤"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索规则标识/域名/路径..."
              className="h-7 w-40 focus:w-52 pl-8 pr-2 text-xs rounded-md border border-neutral-200 bg-white focus:outline-indigo-500 transition-all text-neutral-700"
            />
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-7 px-2 text-xs rounded-md border border-neutral-200 bg-white text-neutral-700 focus:outline-indigo-500"
          >
            <option value="ALL">全部规则类型</option>
            <option value="RULE-SET">RULE-SET (规则集)</option>
            <option value="PROCESS-NAME">PROCESS-NAME (应用进程)</option>
            <option value="DOMAIN-SUFFIX">DOMAIN-SUFFIX (域名后缀)</option>
            <option value="DOMAIN">DOMAIN (完整域名)</option>
            <option value="IP-CIDR">IP-CIDR (网段)</option>
            <option value="GEOIP">GEOIP (地理)</option>
            <option value="FINAL">FINAL (兜底)</option>
          </select>

          <button
            onClick={handleAddNew}
            className="h-7 px-2 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>新建规则</span>
          </button>
        </div>
      </div>

      {/* Notion Rules Table Container with Column Drag Reordering & Resizing */}
      <div className="flex-1 overflow-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEndRow}
        >
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

                  if (colKey === 'grip') {
                    return (
                      <th
                        key="grip"
                        style={{ width: `${colWidth}px` }}
                        className="py-2 px-1 text-center shrink-0"
                      />
                    );
                  }

                  return (
                    <th
                      key={colKey}
                      style={{ width: `${colWidth}px` }}
                      draggable={!isColPinned}
                      onDragStart={(e) => handleDragStart(colKey, e)}
                      onDragOver={(e) => handleDragOver(colKey, e)}
                      onDrop={(e) => handleDrop(colKey, e)}
                      onDragEnd={handleDragEnd}
                      className={`py-2 px-1.5 font-medium relative group/th transition-colors ${
                        isColPinned
                          ? ''
                          : 'cursor-grab active:cursor-grabbing hover:bg-neutral-100/70'
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
              {filteredRules.length === 0 ? (
                <tr>
                  <td colSpan={columnOrder.length} className="py-12 text-center text-neutral-400">
                    没有匹配的分流规则
                  </td>
                </tr>
              ) : (
                <SortableContext
                  items={filteredRules.map((r) => r.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {filteredRules.map((r) => {
                    const originalIdx = rules.findIndex((item) => item.id === r.id);
                    return (
                      <SortableRuleRow
                        key={r.id}
                        rule={r}
                        index={originalIdx}
                        availablePolicies={availablePolicies}
                        isHighlighted={activeFilterGroup === r.targetPolicy}
                        isTargetHighlighted={targetHighlightedRuleId === r.id}
                        widths={widths}
                        columnOrder={columnOrder}
                        onUpdateRule={onUpdateRule}
                        onDeleteRule={onDeleteRule}
                      />
                    );
                  })}
                </SortableContext>
              )}
            </tbody>
          </table>
        </DndContext>
      </div>
    </div>
  );
};
