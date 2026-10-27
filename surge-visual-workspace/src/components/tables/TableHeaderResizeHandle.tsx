import React from 'react';

interface TableHeaderResizeHandleProps {
  onResizeStart: (e: React.MouseEvent) => void;
  onReset: () => void;
}

export const TableHeaderResizeHandle: React.FC<TableHeaderResizeHandleProps> = ({
  onResizeStart,
  onReset,
}) => {
  return (
    <div
      onMouseDown={onResizeStart}
      onDoubleClick={onReset}
      className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize flex items-center justify-center group/resize select-none z-10"
      title="按住鼠标拖拽调整列宽，双击恢复默认宽度"
    >
      <div className="w-[1.5px] h-3.5 bg-neutral-300 group-hover/resize:bg-indigo-500 group-hover/resize:h-full transition-all" />
    </div>
  );
};
