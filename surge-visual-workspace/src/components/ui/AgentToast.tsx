import React, { useEffect } from 'react';
import { Bot, Sparkles, X, GitCompare } from 'lucide-react';

export interface AgentToastData {
  id: string;
  message: string;
  addedGroupsCount?: number;
  updatedGroupsCount?: number;
  addedRulesCount?: number;
  updatedRulesCount?: number;
}

interface AgentToastProps {
  toast: AgentToastData | null;
  onClose: () => void;
  onOpenDiff: () => void;
}

export const AgentToast: React.FC<AgentToastProps> = ({ toast, onClose, onOpenDiff }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, 7000);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  return (
    <div className="fixed top-14 right-5 z-50 select-none animate-in slide-in-from-top-3 fade-in duration-300">
      <div className="w-[360px] bg-white/95 backdrop-blur-md border border-indigo-200 rounded-xl shadow-2xl p-3.5 flex flex-col gap-2.5 text-neutral-800">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-semibold text-xs text-indigo-700">
            <div className="w-5 h-5 rounded-md bg-indigo-100 flex items-center justify-center text-indigo-600">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <span>AI Agent 变动演示</span>
            <Sparkles className="w-3 h-3 text-amber-500 fill-amber-400" />
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 cursor-pointer"
            title="关闭通知"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Message */}
        <div className="text-xs text-neutral-600 leading-relaxed font-normal">
          {toast.message}
        </div>

        {/* Stats Badges */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-neutral-100 text-[10px]">
          {Boolean(toast.addedGroupsCount) && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
              +{toast.addedGroupsCount} 策略组
            </span>
          )}
          {Boolean(toast.updatedGroupsCount) && (
            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium">
              ~{toast.updatedGroupsCount} 策略组优化
            </span>
          )}
          {Boolean(toast.addedRulesCount) && (
            <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-medium">
              +{toast.addedRulesCount} 分流规则
            </span>
          )}
          {Boolean(toast.updatedRulesCount) && (
            <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
              ~{toast.updatedRulesCount} 规则重定向
            </span>
          )}

          <div className="flex-1" />

          {/* Action button */}
          <button
            type="button"
            onClick={() => {
              onOpenDiff();
              onClose();
            }}
            className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex items-center gap-1 shadow-2xs cursor-pointer transition-colors"
          >
            <GitCompare className="w-3 h-3" />
            <span>查看 Diff 审核</span>
          </button>
        </div>
      </div>
    </div>
  );
};
