import { useState, useCallback, useRef } from 'react';

export interface ColumnConfig {
  initialWidth: number;
  minWidth?: number;
  maxWidth?: number;
}

export function useResizableColumns(configs: Record<string, ColumnConfig>) {
  const [widths, setWidths] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const [key, conf] of Object.entries(configs)) {
      init[key] = conf.initialWidth;
    }
    return init;
  });

  const resizingRef = useRef<{
    colKey: string;
    startX: number;
    startWidth: number;
    minWidth: number;
    maxWidth: number;
  } | null>(null);

  const startResizing = useCallback(
    (colKey: string, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const conf = configs[colKey] || { initialWidth: 150, minWidth: 60, maxWidth: 1000 };
      const currentWidth = widths[colKey] || conf.initialWidth;

      resizingRef.current = {
        colKey,
        startX: e.clientX,
        startWidth: currentWidth,
        minWidth: conf.minWidth || 50,
        maxWidth: conf.maxWidth || 1200,
      };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!resizingRef.current) return;
        const delta = moveEvent.clientX - resizingRef.current.startX;
        const newWidth = Math.min(
          Math.max(resizingRef.current.startWidth + delta, resizingRef.current.minWidth),
          resizingRef.current.maxWidth
        );

        setWidths((prev) => ({
          ...prev,
          [resizingRef.current!.colKey]: newWidth,
        }));
      };

      const handleMouseUp = () => {
        resizingRef.current = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [configs, widths]
  );

  const resetColumn = useCallback(
    (colKey: string) => {
      const conf = configs[colKey];
      if (conf) {
        setWidths((prev) => ({
          ...prev,
          [colKey]: conf.initialWidth,
        }));
      }
    },
    [configs]
  );

  return { widths, startResizing, resetColumn };
}
