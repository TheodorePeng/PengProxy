import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PolicyGroup, RoutingRule } from '@/types/surge';
import { formatRuleTitle, getRuleCategory, getCategoryBadgeStyle } from '@/lib/parser/rule-namer';
import { Search, Check, Link2, X } from 'lucide-react';

interface RelationMultiSelectPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRect: DOMRect | null;
  group: PolicyGroup;
  allRules: RoutingRule[];
  onToggleRuleRelation: (ruleId: string, groupName: string) => void;
}

export const RelationMultiSelectPopover: React.FC<RelationMultiSelectPopoverProps> = ({
  isOpen,
  onClose,
  anchorRect,
  group,
  allRules,
  onToggleRuleRelation,
}) => {
  const [search, setSearch] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  // Filtered rules
  const filteredRules = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRules.map((rule, idx) => ({ rule, idx })).filter(({ rule, idx }) => {
      if (!q) return true;
      const title = formatRuleTitle(rule, idx).toLowerCase();
      const pattern = rule.pattern.toLowerCase();
      const target = rule.targetPolicy.toLowerCase();
      return title.includes(q) || pattern.includes(q) || target.includes(q);
    });
  }, [allRules, search]);

  const linkedCount = useMemo(() => {
    return allRules.filter((r) => r.targetPolicy === group.name).length;
  }, [allRules, group.name]);

  if (!isOpen || !anchorRect) return null;

  // Calculate popover position
  const popoverWidth = 360;
  let top = anchorRect.bottom + 6;
  let left = anchorRect.left;

  // Screen boundary protection
  if (left + popoverWidth > window.innerWidth - 16) {
    left = window.innerWidth - popoverWidth - 16;
  }
  if (top + 420 > window.innerHeight) {
    top = Math.max(16, anchorRect.top - 430);
  }

  return (
    <div
      ref={popoverRef}
      style={{
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        width: `${popoverWidth}px`,
      }}
      className="z-50 bg-white rounded-xl shadow-2xl border border-[#e2e2df] flex flex-col text-xs text-neutral-800 animate-in fade-in zoom-in-95 duration-100 select-none overflow-hidden max-h-[440px]"
    >
      {/* Header with Title and Search */}
      <div className="p-3 border-b border-[#f0f0ee] bg-[#fcfcfb] space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-semibold text-neutral-800">
            <Link2 className="w-3.5 h-3.5 text-indigo-600" />
            <span className="truncate max-w-[260px]">关联分流规则: {group.name}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索分流规则 (如 superwhisper、Set、Google)..."
            className="w-full pl-8 pr-7 py-1 text-xs rounded-md border border-neutral-200 bg-white focus:outline-indigo-500 text-neutral-800 placeholder:text-neutral-400"
            autoFocus
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Rules List */}
      <div className="flex-1 overflow-y-auto p-1.5 divide-y divide-neutral-100">
        {filteredRules.length === 0 ? (
          <div className="py-8 text-center text-neutral-400 text-xs">
            未找到匹配的分流规则
          </div>
        ) : (
          filteredRules.map(({ rule, idx }) => {
            const isLinked = rule.targetPolicy === group.name;
            const category = getRuleCategory(rule.ruleType);
            const title = formatRuleTitle(rule, idx);

            return (
              <div
                key={rule.id}
                onClick={() => onToggleRuleRelation(rule.id, group.name)}
                className={`p-2 rounded-lg flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                  isLinked
                    ? 'bg-indigo-50/80 text-indigo-950 font-medium'
                    : 'hover:bg-neutral-50 text-neutral-700'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span
                    className={`font-mono text-[10px] px-1.5 py-0.2 rounded border shrink-0 ${getCategoryBadgeStyle(
                      category
                    )}`}
                  >
                    {title}
                  </span>
                  <span className="text-[11px] text-neutral-500 truncate" title={rule.pattern}>
                    {rule.pattern || '(无条件)'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {!isLinked && (
                    <span className="text-[10px] text-neutral-400 max-w-[80px] truncate">
                      → {rule.targetPolicy}
                    </span>
                  )}
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center transition-all ${
                      isLinked
                        ? 'bg-indigo-600 text-white'
                        : 'border border-neutral-300 text-transparent'
                    }`}
                  >
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Summary */}
      <div className="px-3 py-2 bg-[#fcfcfb] border-t border-[#f0f0ee] flex items-center justify-between text-[11px] text-neutral-500">
        <span>
          已关联 <strong className="text-indigo-600">{linkedCount}</strong> / {allRules.length} 条规则
        </span>
        <span className="text-neutral-400 italic">点击勾选即可实时挂载/解挂</span>
      </div>
    </div>
  );
};
