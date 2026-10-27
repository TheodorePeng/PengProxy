import React, { useState, useEffect } from 'react';
import { PolicyGroup } from '@/types/surge';
import { X, Save, Sliders, Layers } from 'lucide-react';

interface GroupDetailDrawerProps {
  group: PolicyGroup | null;
  onClose: () => void;
  onSave: (updated: PolicyGroup) => void;
}

export const GroupDetailDrawer: React.FC<GroupDetailDrawerProps> = ({ group, onClose, onSave }) => {
  if (!group) return null;

  const [name, setName] = useState(group.name);
  const [type, setType] = useState(group.type);
  const [membersText, setMembersText] = useState(group.members.join(', '));
  const [includeOtherGroup, setIncludeOtherGroup] = useState(
    group.options['include-other-group'] || ''
  );
  const [regexFilter, setRegexFilter] = useState(
    group.options['policy-regex-filter'] || ''
  );
  const [interval, setInterval] = useState(group.options.interval || '');
  const [tolerance, setTolerance] = useState(group.options.tolerance || '');
  const [timeout, setTimeoutVal] = useState(group.options.timeout || '');

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSave = () => {
    const parsedMembers = membersText
      .split(',')
      .map((m) => m.trim())
      .filter((m) => m.length > 0);

    const updatedOptions: Record<string, string | undefined> = { ...group.options };

    if (includeOtherGroup) updatedOptions['include-other-group'] = includeOtherGroup;
    else delete updatedOptions['include-other-group'];

    if (regexFilter) updatedOptions['policy-regex-filter'] = regexFilter;
    else delete updatedOptions['policy-regex-filter'];

    if (interval) updatedOptions.interval = interval;
    else delete updatedOptions.interval;

    if (tolerance) updatedOptions.tolerance = tolerance;
    else delete updatedOptions.tolerance;

    if (timeout) updatedOptions.timeout = timeout;
    else delete updatedOptions.timeout;

    onSave({
      ...group,
      name,
      type,
      members: parsedMembers,
      options: updatedOptions,
    });
    onClose();
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex justify-end pointer-events-none select-none">
      <div className="w-[460px] h-full bg-white shadow-2xl flex flex-col border-l border-[#dcdcd9] pointer-events-auto animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-[#e9e9e7] flex items-center justify-between bg-[#fcfcfb]">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-600" />
            <h3 className="font-semibold text-sm text-neutral-800">策略组高级参数配置</h3>
            <span className="text-[10px] text-neutral-400 font-mono bg-neutral-100 px-1.5 py-0.5 rounded">
              Esc 关闭
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 cursor-pointer"
            title="关闭侧边抽屉 (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Fields */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs text-neutral-700">
          <div>
            <label className="block font-medium mb-1 text-neutral-600">策略组名称 (Name)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-md focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-medium mb-1 text-neutral-600">策略组类型 (Type)</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-md focus:border-indigo-500 focus:outline-none"
            >
              <option value="select">select (手动选择)</option>
              <option value="url-test">url-test (自动测速)</option>
              <option value="fallback">fallback (故障转移)</option>
              <option value="load-balance">load-balance (负载均衡)</option>
            </select>
          </div>

          <div>
            <label className="block font-medium mb-1 text-neutral-600">
              直接成员节点/子组 (用逗号分隔)
            </label>
            <textarea
              rows={3}
              value={membersText}
              onChange={(e) => setMembersText(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-md focus:border-indigo-500 focus:outline-none font-mono text-xs"
              placeholder="DIRECT, 节点A, 节点B"
            />
          </div>

          <div>
            <label className="block font-medium mb-1 text-neutral-600">
              包含外部组 (include-other-group)
            </label>
            <input
              type="text"
              value={includeOtherGroup}
              onChange={(e) => setIncludeOtherGroup(e.target.value)}
              placeholder="如 极速机场-yuang, 赔钱机场-yuang"
              className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-md focus:border-indigo-500 focus:outline-none"
            />
            <p className="text-[11px] text-neutral-400 mt-1">自动合并指定策略组解析出的节点</p>
          </div>

          <div>
            <label className="block font-medium mb-1 text-neutral-600">
              节点正则筛选 (policy-regex-filter)
            </label>
            <input
              type="text"
              value={regexFilter}
              onChange={(e) => setRegexFilter(e.target.value)}
              placeholder="如 ^(?!.*无脑).*(美国).*$"
              className="w-full px-2.5 py-1.5 border border-neutral-300 rounded-md focus:border-indigo-500 focus:outline-none font-mono text-xs"
            />
            <p className="text-[11px] text-neutral-400 mt-1">仅匹配符合正则表达式的节点</p>
          </div>

          {/* Test parameters section */}
          <div className="pt-3 border-t border-neutral-100">
            <h4 className="font-semibold text-neutral-800 mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-neutral-500" />
              <span>测速与容差参数 (url-test / fallback)</span>
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] text-neutral-500 mb-1">测速间隔 (interval)</label>
                <input
                  type="text"
                  value={interval}
                  onChange={(e) => setInterval(e.target.value)}
                  placeholder="1800"
                  className="w-full px-2 py-1 border border-neutral-300 rounded-md text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-neutral-500 mb-1">容差毫秒 (tolerance)</label>
                <input
                  type="text"
                  value={tolerance}
                  onChange={(e) => setTolerance(e.target.value)}
                  placeholder="88"
                  className="w-full px-2 py-1 border border-neutral-300 rounded-md text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-neutral-500 mb-1">超时秒数 (timeout)</label>
                <input
                  type="text"
                  value={timeout}
                  onChange={(e) => setTimeoutVal(e.target.value)}
                  placeholder="5"
                  className="w-full px-2 py-1 border border-neutral-300 rounded-md text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#e9e9e7] bg-[#fcfcfb] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-md text-xs font-medium text-neutral-600 hover:bg-neutral-100 border border-neutral-200"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-3.5 py-1.5 rounded-md text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 flex items-center gap-1.5 shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            <span>保存参数</span>
          </button>
        </div>
      </div>
    </div>
  );
};
