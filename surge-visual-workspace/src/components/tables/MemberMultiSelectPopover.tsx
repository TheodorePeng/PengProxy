import React, { useState, useMemo, useEffect, useRef } from 'react';
import { PolicyGroup } from '@/types/surge';
import { Search, Check, Plus, Layers, Server, X } from 'lucide-react';

interface MemberMultiSelectPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRect: DOMRect | null;
  group: PolicyGroup;
  allGroupNames: string[];
  knownNodes: string[];
  onToggleMember: (memberName: string) => void;
  onAddMember: (newMember: string) => void;
  onUpdateIncludeOtherGroup: (value: string) => void;
}

export const MemberMultiSelectPopover: React.FC<MemberMultiSelectPopoverProps> = ({
  isOpen,
  onClose,
  anchorRect,
  group,
  allGroupNames,
  knownNodes,
  onToggleMember,
  onAddMember,
  onUpdateIncludeOtherGroup,
}) => {
  const [search, setSearch] = useState('');
  const [includeOther, setIncludeOther] = useState(group.options['include-other-group'] || '');
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIncludeOther(group.options['include-other-group'] || '');
  }, [group]);

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

  // Exclude current group from subgroup choices to prevent direct self-loop
  const availableGroups = useMemo(() => {
    return allGroupNames.filter((name) => name !== group.name);
  }, [allGroupNames, group.name]);

  // Filtered groups
  const filteredGroups = useMemo(() => {
    return availableGroups.filter((name) =>
      name.toLowerCase().includes(search.toLowerCase())
    );
  }, [availableGroups, search]);

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    return knownNodes.filter((name) =>
      name.toLowerCase().includes(search.toLowerCase())
    );
  }, [knownNodes, search]);

  const exactMatchExists = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      group.members.some((m) => m.toLowerCase() === q) ||
      availableGroups.some((g) => g.toLowerCase() === q) ||
      knownNodes.some((n) => n.toLowerCase() === q)
    );
  }, [search, group.members, availableGroups, knownNodes]);

  if (!isOpen || !anchorRect) return null;

  // Calculate popover position
  const popoverWidth = 320;
  let top = anchorRect.bottom + 6;
  let left = anchorRect.left;

  // Screen overflow adjustments
  if (left + popoverWidth > window.innerWidth - 16) {
    left = window.innerWidth - popoverWidth - 16;
  }
  if (top + 400 > window.innerHeight) {
    top = Math.max(16, anchorRect.top - 410);
  }

  const handleCreate = () => {
    const trimmed = search.trim();
    if (trimmed && !group.members.includes(trimmed)) {
      onAddMember(trimmed);
      setSearch('');
    }
  };

  const handleIncludeOtherBlur = () => {
    onUpdateIncludeOtherGroup(includeOther.trim());
  };

  return (
    <div
      ref={popoverRef}
      style={{
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        width: `${popoverWidth}px`,
      }}
      className="z-50 bg-white rounded-xl shadow-2xl border border-[#e2e2df] flex flex-col text-xs text-neutral-800 animate-in fade-in zoom-in-95 duration-100 select-none overflow-hidden max-h-[420px]"
    >
      {/* Search Input Bar */}
      <div className="p-2.5 border-b border-[#f0f0ee] bg-[#fcfcfb] flex items-center gap-2">
        <Search className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleCreate();
            }
          }}
          placeholder="搜索策略组、节点或回车新建..."
          className="flex-1 bg-transparent text-xs text-neutral-800 focus:outline-none placeholder:text-neutral-400"
          autoFocus
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="p-0.5 rounded text-neutral-400 hover:text-neutral-600"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Popover Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-1.5 space-y-2 divide-y divide-neutral-100">
        {/* Create new item button if no exact match */}
        {search.trim() && !exactMatchExists && (
          <div className="pb-1">
            <button
              onClick={handleCreate}
              className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 flex items-center gap-2 font-medium transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">创建成员: "{search.trim()}"</span>
            </button>
          </div>
        )}

        {/* Section 1: Policy Groups */}
        {filteredGroups.length > 0 && (
          <div className="pt-1">
            <div className="px-2 py-1 text-[10px] font-semibold tracking-wider text-neutral-400 uppercase flex items-center gap-1">
              <Layers className="w-3 h-3" />
              <span>嵌套子策略组 (Sub-Groups)</span>
            </div>
            <div className="space-y-0.5">
              {filteredGroups.map((groupName) => {
                const isSelected = group.members.includes(groupName);
                return (
                  <div
                    key={groupName}
                    onClick={() => onToggleMember(groupName)}
                    className={`px-2 py-1.5 rounded-md flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-indigo-50/80 text-indigo-900 font-medium'
                        : 'hover:bg-neutral-100 text-neutral-700'
                    }`}
                  >
                    <span className="truncate pr-2">{groupName}</span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Section 2: Known Nodes & Targets */}
        {filteredNodes.length > 0 && (
          <div className="pt-1">
            <div className="px-2 py-1 text-[10px] font-semibold tracking-wider text-neutral-400 uppercase flex items-center gap-1">
              <Server className="w-3 h-3" />
              <span>系统与代理节点 (Nodes)</span>
            </div>
            <div className="space-y-0.5">
              {filteredNodes.map((nodeName) => {
                const isSelected = group.members.includes(nodeName);
                return (
                  <div
                    key={nodeName}
                    onClick={() => onToggleMember(nodeName)}
                    className={`px-2 py-1.5 rounded-md flex items-center justify-between cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-indigo-50/80 text-indigo-900 font-medium'
                        : 'hover:bg-neutral-100 text-neutral-700'
                    }`}
                  >
                    <span className="truncate pr-2">{nodeName}</span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty Search Result Notice */}
        {filteredGroups.length === 0 && filteredNodes.length === 0 && !search.trim() && (
          <div className="py-4 text-center text-neutral-400 text-xs">
            暂无可选候选项
          </div>
        )}
      </div>

      {/* External Group inclusion footer */}
      <div className="p-2.5 bg-[#fcfcfb] border-t border-[#f0f0ee] space-y-1">
        <label className="block text-[10px] font-medium text-neutral-500 uppercase tracking-wider">
          外部来源 (include-other-group)
        </label>
        <input
          type="text"
          value={includeOther}
          onChange={(e) => setIncludeOther(e.target.value)}
          onBlur={handleIncludeOtherBlur}
          onKeyDown={(e) => e.key === 'Enter' && handleIncludeOtherBlur()}
          placeholder="如 极速机场, 赔钱机场"
          className="w-full px-2 py-1 text-xs border border-neutral-200 rounded-md focus:border-indigo-500 focus:outline-none bg-white text-neutral-800"
        />
      </div>
    </div>
  );
};
