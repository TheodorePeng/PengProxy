import { useState, useEffect, useCallback } from 'react';

interface UseColumnOrderOptions {
  defaultColumns: string[];
  storageKey: string;
  pinnedStart?: string[];
  pinnedEnd?: string[];
}

export function useColumnOrder({
  defaultColumns,
  storageKey,
  pinnedStart = [],
  pinnedEnd = [],
}: UseColumnOrderOptions) {
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed: string[] = JSON.parse(saved);
        // Ensure all valid columns exist and filter out obsolete ones
        const validSet = new Set(defaultColumns);
        const filtered = parsed.filter((c) => validSet.has(c));
        // Add any newly introduced columns that weren't in saved
        for (const col of defaultColumns) {
          if (!filtered.includes(col)) {
            // Insert before pinnedEnd if possible
            const endIdx = filtered.findIndex((c) => pinnedEnd.includes(c));
            if (endIdx !== -1) {
              filtered.splice(endIdx, 0, col);
            } else {
              filtered.push(col);
            }
          }
        }
        return filtered;
      }
    } catch (e) {
      console.warn('Failed to load column order from localStorage', e);
    }
    return defaultColumns;
  });

  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(columnOrder));
    } catch (e) {
      console.warn('Failed to save column order to localStorage', e);
    }
  }, [columnOrder, storageKey]);

  const isPinned = useCallback(
    (colId: string) => {
      return pinnedStart.includes(colId) || pinnedEnd.includes(colId);
    },
    [pinnedStart, pinnedEnd]
  );

  const handleDragStart = useCallback(
    (colId: string, e: React.DragEvent) => {
      if (isPinned(colId)) {
        e.preventDefault();
        return;
      }
      setDraggedColumnId(colId);
      e.dataTransfer.setData('text/plain', colId);
      e.dataTransfer.effectAllowed = 'move';
    },
    [isPinned]
  );

  const handleDragOver = useCallback(
    (colId: string, e: React.DragEvent) => {
      if (!draggedColumnId || isPinned(colId) || colId === draggedColumnId) {
        return;
      }
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOverColumnId(colId);
    },
    [draggedColumnId, isPinned]
  );

  const handleDrop = useCallback(
    (targetColId: string, e: React.DragEvent) => {
      e.preventDefault();
      if (!draggedColumnId || isPinned(targetColId) || draggedColumnId === targetColId) {
        setDraggedColumnId(null);
        setDragOverColumnId(null);
        return;
      }

      setColumnOrder((prev) => {
        const fromIdx = prev.indexOf(draggedColumnId);
        const toIdx = prev.indexOf(targetColId);
        if (fromIdx === -1 || toIdx === -1) return prev;

        const next = [...prev];
        next.splice(fromIdx, 1);
        next.splice(toIdx, 0, draggedColumnId);
        return next;
      });

      setDraggedColumnId(null);
      setDragOverColumnId(null);
    },
    [draggedColumnId, isPinned]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedColumnId(null);
    setDragOverColumnId(null);
  }, []);

  const resetColumnOrder = useCallback(() => {
    setColumnOrder(defaultColumns);
    try {
      localStorage.removeItem(storageKey);
    } catch (e) {
      console.warn('Failed to clear column order from localStorage', e);
    }
  }, [defaultColumns, storageKey]);

  return {
    columnOrder,
    draggedColumnId,
    dragOverColumnId,
    isPinned,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    resetColumnOrder,
  };
}
