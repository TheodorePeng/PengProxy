import React, { useState } from 'react';
import { ProfileDiff } from '@/types/surge';
import { generateAgentChangePlan } from '@/lib/agent-exporter';
import { downloadConfigFile } from '@/lib/file-system';
import { X, Copy, Check, Download, GitCompare, Bot, FileText, CheckCircle2 } from 'lucide-react';

interface ChangesModalProps {
  isOpen: boolean;
  onClose: () => void;
  diff: ProfileDiff;
  fileName: string;
}

export const ChangesModal: React.FC<ChangesModalProps> = ({
  isOpen,
  onClose,
  diff,
  fileName,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'diff' | 'export' | 'agent'>('diff');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const changedSnippets = diff.diffLines
    .filter((l) => l.type === 'add')
    .map((l) => l.value)
    .join('\n');

  const agentPrompt = generateAgentChangePlan(diff, fileName);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 select-none">
      <div className="w-[840px] max-w-full h-[620px] max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col border border-[#e9e9e7] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#e9e9e7] flex items-center justify-between bg-[#fcfcfb]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600">
              <GitCompare className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-sm text-neutral-800">
                变更工作区 (Changes & Export Workspace)
              </h2>
              <p className="text-[11px] text-neutral-500">
                {diff.hasChanges
                  ? `共检测到 +${diff.summary.addedLines} 行新增 / -${diff.summary.removedLines} 行移除`
                  : '配置未发生任何变动 (当前与原配置一致)'}
              </p>
            </div>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center bg-neutral-100 p-0.5 rounded-lg text-xs font-medium border border-neutral-200/80">
            <button
              onClick={() => setActiveTab('diff')}
              className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'diff'
                  ? 'bg-white text-indigo-700 shadow-2xs font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>Diff 对比</span>
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'export'
                  ? 'bg-white text-indigo-700 shadow-2xs font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>导出与复制</span>
            </button>
            <button
              onClick={() => setActiveTab('agent')}
              className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'agent'
                  ? 'bg-white text-indigo-700 shadow-2xs font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>AI Agent 指令</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden bg-[#fafafa]">
          {/* TAB 1: Visual Diff */}
          {activeTab === 'diff' && (
            <div className="h-full overflow-y-auto p-4 font-mono text-xs">
              {!diff.hasChanges ? (
                <div className="h-full flex flex-col items-center justify-center text-neutral-400 gap-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500/80" />
                  <p>当前虚拟草稿与加载的原始配置文件完全一致，无任何变更。</p>
                </div>
              ) : (
                <div className="border border-neutral-200 rounded-lg overflow-hidden bg-white shadow-2xs divide-y divide-neutral-100">
                  {diff.diffLines.map((line, idx) => {
                    const isAdd = line.type === 'add';
                    const isRemove = line.type === 'remove';

                    return (
                      <div
                        key={idx}
                        className={`flex items-start text-[11px] leading-relaxed py-0.5 px-3 ${
                          isAdd
                            ? 'bg-emerald-50/80 text-emerald-900 font-medium'
                            : isRemove
                            ? 'bg-red-50/80 text-red-900 line-through'
                            : 'text-neutral-600 hover:bg-neutral-50/60'
                        }`}
                      >
                        <span className="w-8 text-neutral-400 shrink-0 select-none text-right pr-2">
                          {line.oldLineNumber || ''}
                        </span>
                        <span className="w-8 text-neutral-400 shrink-0 select-none text-right pr-2">
                          {line.newLineNumber || ''}
                        </span>
                        <span className="w-4 select-none font-bold text-center">
                          {isAdd ? '+' : isRemove ? '-' : ' '}
                        </span>
                        <span className="flex-1 break-all whitespace-pre-wrap">{line.value}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Export & Copy */}
          {activeTab === 'export' && (
            <div className="h-full overflow-y-auto p-5 space-y-5">
              {/* Snippet box */}
              <div className="bg-white border border-neutral-200 rounded-lg p-4 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-xs text-neutral-800">
                      方式 1: 仅复制变动代码行 (Snippet)
                    </h3>
                    <p className="text-[11px] text-neutral-500">
                      只提取新增或调整后的规则行，方便快速手动粘贴到本地配置对应位置
                    </p>
                  </div>
                  <button
                    disabled={!diff.hasChanges}
                    onClick={() => handleCopy(changedSnippets, 'snippet')}
                    className="px-3 py-1.5 rounded-md text-xs font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-700 flex items-center gap-1.5 transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    {copiedKey === 'snippet' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedKey === 'snippet' ? '已复制片段' : '一键复制片段'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-neutral-50 rounded-md border border-neutral-200 text-[11px] font-mono text-neutral-700 max-h-36 overflow-y-auto whitespace-pre-wrap">
                  {changedSnippets || '(无变动代码行)'}
                </pre>
              </div>

              {/* Full config box */}
              <div className="bg-white border border-neutral-200 rounded-lg p-4 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-xs text-neutral-800">
                      方式 2: 获取完整 Surge 配置文件
                    </h3>
                    <p className="text-[11px] text-neutral-500">
                      整份包含无损保留的 General、Host 等全部段落的最新配置文件
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(diff.modifiedText, 'full')}
                      className="px-3 py-1.5 rounded-md text-xs font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copiedKey === 'full' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedKey === 'full' ? '已复制全文' : '复制全文'}</span>
                    </button>
                    <button
                      onClick={() => downloadConfigFile(fileName, diff.modifiedText)}
                      className="px-3 py-1.5 rounded-md text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>下载 .conf 文件</span>
                    </button>
                  </div>
                </div>
                <div className="text-[11px] text-neutral-400 italic">
                  提示：下载后可直接替换 Mac 上的本地文件或在 Surge 菜单中导入。
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AI Agent Plan */}
          {activeTab === 'agent' && (
            <div className="h-full overflow-y-auto p-5 space-y-4">
              <div className="bg-white border border-neutral-200 rounded-lg p-4 shadow-2xs">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-xs text-neutral-800 flex items-center gap-1.5">
                      <Bot className="w-4 h-4 text-indigo-600" />
                      <span>交由本地 AI Agent (surge-operator-peng) 自动化打补丁</span>
                    </h3>
                    <p className="text-[11px] text-neutral-500 mt-0.5">
                      复制以下标准化变更计划，直接发给本机的 Claude Code / Antigravity / Codex，Agent 会自动先备份再应用！
                    </p>
                  </div>
                  <button
                    disabled={!diff.hasChanges}
                    onClick={() => handleCopy(agentPrompt, 'agent')}
                    className="px-3.5 py-1.5 rounded-md text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-40 cursor-pointer"
                  >
                    {copiedKey === 'agent' ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedKey === 'agent' ? '已复制指令' : '一键复制 Agent 指令'}</span>
                  </button>
                </div>
                <pre className="p-3 bg-neutral-900 text-neutral-200 rounded-md text-[11px] font-mono leading-relaxed max-h-72 overflow-y-auto whitespace-pre-wrap">
                  {agentPrompt}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#e9e9e7] bg-[#fcfcfb] flex items-center justify-between text-xs text-neutral-500">
          <span>
            提示：当前工作台遵循严格的本地无损解析，原始文件保持完全只读。
          </span>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-md text-xs font-medium text-neutral-700 hover:bg-neutral-100 border border-neutral-300 transition-colors cursor-pointer"
          >
            关闭工作区
          </button>
        </div>
      </div>
    </div>
  );
};
