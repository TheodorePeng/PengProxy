import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GripVertical } from 'lucide-react';

interface ResizableSplitProps {
  left: React.ReactNode;
  right: React.ReactNode;
  isSwapped: boolean;
}

const DEFAULT_SPLIT_RATIO = 65; // Left (Policy Groups) 65% : Right (Routing Rules) 35%
const SPLIT_RATIO_STORAGE_KEY = 'surge_workspace_split_ratio_v2';

export const ResizableSplit: React.FC<ResizableSplitProps> = ({ left, right, isSwapped }) => {
  const [splitRatio, setSplitRatio] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(SPLIT_RATIO_STORAGE_KEY);
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 20 && parsed <= 85) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to read split ratio from localStorage', e);
    }
    return DEFAULT_SPLIT_RATIO;
  });

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync split ratio to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(SPLIT_RATIO_STORAGE_KEY, splitRatio.toFixed(1));
    } catch (e) {
      console.warn('Failed to write split ratio to localStorage', e);
    }
  }, [splitRatio]);

  const startDragging = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDoubleClickDivider = useCallback(() => {
    setSplitRatio(DEFAULT_SPLIT_RATIO);
  }, []);

  const handleWheelOnDivider = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY || e.deltaX;
    setSplitRatio((prev) => {
      const step = delta > 0 ? 1.5 : -1.5;
      return Math.min(Math.max(prev + step, 20), 85);
    });
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newRatio = ((e.clientX - rect.left) / rect.width) * 100;
      if (newRatio >= 20 && newRatio <= 80) {
        setSplitRatio(newRatio);
      }
    };

    const handleMouseUp = () => {
      if (isDragging) setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  const primaryPane = isSwapped ? right : left;
  const secondaryPane = isSwapped ? left : right;

  return (
    <div
      ref={containerRef}
      className="flex-1 flex overflow-hidden relative select-none bg-[#fbfbfa]"
    >
      {/* Primary (Left) Pane */}
      <div
        style={{ width: `${splitRatio}%` }}
        className="h-full overflow-hidden flex flex-col bg-white border-r border-[#e9e9e7]"
      >
        {primaryPane}
      </div>

      {/* Resizable Divider with Handle */}
      <div
        onMouseDown={startDragging}
        onDoubleClick={handleDoubleClickDivider}
        onWheel={handleWheelOnDivider}
        className={`w-2 relative flex items-center justify-center cursor-col-resize z-20 group transition-colors ${
          isDragging ? 'bg-indigo-400' : 'hover:bg-indigo-300 bg-neutral-200/70'
        }`}
        title="按住拖拽左右分栏宽度，双击把手一键复位至 65%:35%，或滚动滚轮微调"
      >
        <div className="absolute top-1/2 -translate-y-1/2 w-4 h-8 rounded bg-white shadow-xs border border-neutral-300 flex items-center justify-center opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all pointer-events-none">
          <GripVertical className="w-3 h-3 text-neutral-500" />
        </div>
      </div>

      {/* Secondary (Right) Pane */}
      <div
        style={{ width: `${100 - splitRatio}%` }}
        className="h-full overflow-hidden flex flex-col bg-white"
      >
        {secondaryPane}
      </div>
    </div>
  );
};
