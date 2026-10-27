import React, { useRef } from 'react';
import { FileCode, PlayCircle, RotateCcw, GitCompare, ArrowLeftRight, ClipboardPaste } from 'lucide-react';

interface HeaderProps {
  fileName: string;
  isDemo: boolean;
  hasChanges: boolean;
  changeCount: number;
  isSwapped: boolean;
  onSwapLayout: () => void;
  onLoadFile: (name: string, content: string) => void;
  onLoadDemo: () => void;
  onResetDraft: () => void;
  onOpenChanges: () => void;
  onOpenPasteModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  fileName,
  isDemo,
  hasChanges,
  changeCount,
  isSwapped,
  onSwapLayout,
  onLoadFile,
  onLoadDemo,
  onResetDraft,
  onOpenChanges,
  onOpenPasteModal,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenClick = () => {
    // Directly trigger native standard file input to bypass Chromium's sensitive system directory restriction
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        onLoadFile(file.name, reader.result as string);
      };
      reader.readAsText(file);
    }
  };

  return (
    <header className="h-14 border-b border-[#e9e9e7] bg-white px-4 flex items-center justify-between shadow-xs sticky top-0 z-30 select-none">
      {/* Hidden standard file input - NO sensitive directory restriction */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".conf,.txt,.list"
        className="hidden"
      />

      {/* Left: Brand & File Info */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
          ⚡
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm tracking-tight text-neutral-800">
              Surge Visual Workspace
            </span>
            <span
              className={`text-[11px] px-1.5 py-0.5 rounded-md font-medium ${
                isDemo
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {isDemo ? 'Demo 模式' : fileName}
            </span>
            {hasChanges && (
              <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-medium animate-pulse">
                已编辑 ({changeCount} 处变更)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onSwapLayout}
          title="互换左右表格位置"
          className="h-8 px-2.5 rounded-md text-xs font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          <span>{isSwapped ? '规则 ⇋ 策略组' : '策略组 ⇋ 规则'}</span>
        </button>

        <button
          onClick={handleOpenClick}
          title="通过系统原生文件选取框选择本地 Surge-Peng.conf"
          className="h-8 px-2.5 rounded-md text-xs font-medium text-neutral-700 bg-white border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
        >
          <FileCode className="w-3.5 h-3.5 text-neutral-500" />
          <span>打开本地配置</span>
        </button>

        <button
          onClick={onOpenPasteModal}
          title="在弹窗中直接粘贴 Surge 配置全文 (支持快捷键 Cmd+V)"
          className="h-8 px-2.5 rounded-md text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
        >
          <ClipboardPaste className="w-3.5 h-3.5 text-indigo-600" />
          <span>粘贴配置文本</span>
        </button>

        <button
          onClick={onLoadDemo}
          className="h-8 px-2.5 rounded-md text-xs font-medium text-neutral-700 bg-white border border-neutral-200 hover:bg-neutral-50 hover:border-neutral-300 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
        >
          <PlayCircle className="w-3.5 h-3.5 text-neutral-500" />
          <span>加载 Demo</span>
        </button>

        {hasChanges && (
          <button
            onClick={onResetDraft}
            className="h-8 px-2.5 rounded-md text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>重置草稿</span>
          </button>
        )}

        <button
          onClick={onOpenChanges}
          className={`h-8 px-3 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
            hasChanges
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white font-semibold'
              : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
          }`}
        >
          <GitCompare className="w-3.5 h-3.5" />
          <span>查看变更 & 导出</span>
          {hasChanges && (
            <span className="ml-0.5 px-1.5 py-0.2 bg-indigo-500 rounded-full text-[10px]">
              {changeCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
