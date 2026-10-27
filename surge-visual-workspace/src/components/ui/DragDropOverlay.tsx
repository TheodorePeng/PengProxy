import React from 'react';
import { FileUp } from 'lucide-react';

interface DragDropOverlayProps {
  isVisible: boolean;
}

export const DragDropOverlay: React.FC<DragDropOverlayProps> = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-indigo-900/20 backdrop-blur-xs flex items-center justify-center p-8 pointer-events-none animate-in fade-in duration-100 select-none">
      <div className="w-[420px] max-w-full p-8 rounded-2xl bg-white/95 shadow-2xl border-2 border-dashed border-indigo-500 flex flex-col items-center text-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-xs">
          <FileUp className="w-7 h-7 animate-bounce" />
        </div>
        <div>
          <h3 className="font-semibold text-base text-neutral-800">
            释放以直接载入 Surge 配置
          </h3>
          <p className="text-xs text-neutral-500 mt-1">
            支持从 Finder 拖拽任意 Surge 配置文件（不受系统敏感目录限制）
          </p>
        </div>
      </div>
    </div>
  );
};
