import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { RoutingRule } from '@/types/surge';
import { formatRuleTitle, getRuleCategory, getCategoryBadgeStyle } from '@/lib/parser/rule-namer';
import { GripVertical, Trash2 } from 'lucide-react';

interface SortableRuleRowProps {
  rule: RoutingRule;
  index: number;
  availablePolicies: string[];
  isHighlighted: boolean;
  isTargetHighlighted?: boolean;
  widths: Record<string, number>;
  columnOrder?: string[];
  onUpdateRule: (updatedRule: RoutingRule) => void;
  onDeleteRule: (ruleId: string) => void;
}

const DEFAULT_RULE_COLUMNS = [
  'grip',
  'ruleName',
  'targetPolicy',
  'ruleType',
  'pattern',
  'actions',
];

export const SortableRuleRow: React.FC<SortableRuleRowProps> = ({
  rule,
  index,
  availablePolicies,
  isHighlighted,
  isTargetHighlighted = false,
  widths,
  columnOrder = DEFAULT_RULE_COLUMNS,
  onUpdateRule,
  onDeleteRule,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: rule.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.6 : 1,
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdateRule({ ...rule, ruleType: e.target.value });
  };

  const handlePatternChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateRule({ ...rule, pattern: e.target.value });
  };

  const handleTargetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdateRule({ ...rule, targetPolicy: e.target.value });
  };

  const isFinal = rule.ruleType === 'FINAL';
  const category = getRuleCategory(rule.ruleType);
  const ruleTitle = formatRuleTitle(rule, index);

  return (
    <tr
      id={`rule-row-${rule.id}`}
      data-agent-rule={rule.id}
      data-agent-pattern={rule.pattern}
      ref={setNodeRef}
      style={style}
      className={`group transition-all duration-300 border-b border-[#f0f0ee] ${
        isDragging
          ? 'bg-indigo-50 shadow-md'
          : isTargetHighlighted
          ? 'bg-indigo-100/90 ring-2 ring-indigo-500 ring-inset shadow-md font-medium'
          : isHighlighted
          ? 'bg-indigo-50/80 font-medium'
          : 'hover:bg-[#f9f9f8]'
      }`}
    >
      {columnOrder.map((colKey) => {
        // 1. Grip Handle
        if (colKey === 'grip') {
          return (
            <td
              key="grip"
              style={{ width: `${widths.grip || 32}px`, maxWidth: `${widths.grip || 32}px` }}
              className="py-2 px-1 text-center shrink-0"
            >
              <button
                {...attributes}
                {...listeners}
                className="p-1 text-neutral-300 group-hover:text-neutral-500 cursor-grab active:cursor-grabbing hover:bg-neutral-100 rounded"
                title="按住拖拽调整规则匹配优先级"
              >
                <GripVertical className="w-3.5 h-3.5" />
              </button>
            </td>
          );
        }

        // 2. Rule Name: {序号}-{Type}-{主题名}
        if (colKey === 'ruleName') {
          return (
            <td
              key="ruleName"
              style={{ width: `${widths.ruleName || 180}px`, maxWidth: `${widths.ruleName || 180}px` }}
              className="py-2 px-1 truncate"
            >
              <div className="flex items-center">
                <span
                  className={`font-mono text-[11px] font-semibold px-2 py-0.5 rounded-md border inline-flex items-center gap-1 max-w-full truncate shadow-2xs ${getCategoryBadgeStyle(
                    category
                  )}`}
                  title={`规则标识: ${ruleTitle}\n原始类型: ${rule.ruleType}\n匹配条件: ${rule.pattern || '(无)'}`}
                >
                  <span className="truncate">{ruleTitle}</span>
                </span>
              </div>
            </td>
          );
        }

        // 3. Target Policy Column (Promoted to 2nd prominent data column!)
        if (colKey === 'targetPolicy') {
          return (
            <td
              key="targetPolicy"
              style={{ width: `${widths.targetPolicy || 170}px`, maxWidth: `${widths.targetPolicy || 170}px` }}
              className="py-2 px-1.5 truncate"
            >
              <select
                value={rule.targetPolicy}
                onChange={handleTargetChange}
                className="w-full text-xs px-1.5 py-0.5 rounded border border-neutral-200 bg-white text-neutral-800 font-medium cursor-pointer focus:outline-indigo-500 truncate"
              >
                <optgroup label="系统内置目标">
                  <option value="DIRECT">DIRECT (直连)</option>
                  <option value="REJECT">REJECT (拦截)</option>
                  <option value="REJECT-TINYGIF">REJECT-TINYGIF</option>
                  <option value="REJECT-DROP">REJECT-DROP</option>
                </optgroup>
                <optgroup label="自定义策略组 (Relation)">
                  {availablePolicies.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </optgroup>
              </select>
            </td>
          );
        }

        // 4. Rule Type Dropdown
        if (colKey === 'ruleType') {
          return (
            <td
              key="ruleType"
              style={{ width: `${widths.ruleType || 110}px`, maxWidth: `${widths.ruleType || 110}px` }}
              className="py-2 px-1 truncate"
            >
              <select
                value={rule.ruleType}
                onChange={handleTypeChange}
                className="text-[11px] px-1 py-0.5 rounded font-medium border border-neutral-200 bg-white cursor-pointer focus:outline-none w-full truncate text-neutral-700"
              >
                <option value="RULE-SET">RULE-SET</option>
                <option value="PROCESS-NAME">PROCESS-NAME</option>
                <option value="DOMAIN-SUFFIX">DOMAIN-SUFFIX</option>
                <option value="DOMAIN">DOMAIN</option>
                <option value="DOMAIN-KEYWORD">DOMAIN-KEYWORD</option>
                <option value="IP-CIDR">IP-CIDR</option>
                <option value="GEOIP">GEOIP</option>
                <option value="FINAL">FINAL</option>
                <option value="OR">OR</option>
              </select>
            </td>
          );
        }

        // 5. Pattern / Target Match
        if (colKey === 'pattern') {
          return (
            <td
              key="pattern"
              style={{ width: `${widths.pattern || 240}px`, maxWidth: `${widths.pattern || 240}px` }}
              className="py-2 px-1.5 truncate"
            >
              {isFinal ? (
                <span className="text-neutral-400 italic text-[11px]">(兜底规则无匹配条件)</span>
              ) : (
                <input
                  type="text"
                  value={rule.pattern}
                  onChange={handlePatternChange}
                  placeholder="如 *.google.com 或规则集 URL"
                  className="w-full text-xs px-1.5 py-0.5 border border-transparent hover:border-neutral-200 focus:border-indigo-400 rounded bg-transparent focus:bg-white focus:outline-none transition-all truncate text-neutral-800"
                  title={rule.pattern}
                />
              )}
            </td>
          );
        }

        // 6. Actions
        if (colKey === 'actions') {
          return (
            <td
              key="actions"
              style={{ width: `${widths.actions || 55}px`, maxWidth: `${widths.actions || 55}px` }}
              className="py-2 px-1 text-right truncate"
            >
              <button
                onClick={() => onDeleteRule(rule.id)}
                title="删除此规则"
                className="p-1 text-neutral-300 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer opacity-40 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </td>
          );
        }

        return null;
      })}
    </tr>
  );
};
