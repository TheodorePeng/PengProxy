import React, { useState, useEffect, useRef } from 'react';
import { PolicyGroup } from '@/types/surge';
import { Gauge, Check, X, RotateCcw } from 'lucide-react';

interface SpeedTestPopoverProps {
  group: PolicyGroup;
  anchorRect: DOMRect | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (interval?: string, tolerance?: string, url?: string) => void;
}

export const SpeedTestPopover: React.FC<SpeedTestPopoverProps> = ({
  group,
  anchorRect,
  isOpen,
  onClose,
  onSave,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  const [interval, setInterval] = useState(group.options.interval || '');
  const [tolerance, setTolerance] = useState(group.options.tolerance || '');
  const [url, setUrl] = useState(group.options.url || '');

  // Sync state whenever group changes
  useEffect(() => {
    setInterval(group.options.interval || '');
    setTolerance(group.options.tolerance || '');
    setUrl(group.options.url || '');
  }, [group]);

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !anchorRect) return null;

  // Compute position
  const popoverWidth = 320;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let left = anchorRect.left;
  if (left + popoverWidth > viewportWidth - 20) {
    left = Math.max(10, viewportWidth - popoverWidth - 20);
  }

  let top = anchorRect.bottom + 6;
  if (top + 330 > viewportHeight - 20) {
    top = Math.max(10, anchorRect.top - 330 - 6);
  }

  const handleApply = () => {
    onSave(
      interval.trim() || undefined,
      tolerance.trim() || undefined,
      url.trim() || undefined
    );
    onClose();
  };

  const handleClear = () => {
    setInterval('');
    setTolerance('');
    setUrl('');
    onSave(undefined, undefined, undefined);
    onClose();
  };

  return (
    <div
      ref={popoverRef}
      style={{
        position: 'fixed',
        left: `${left}px`,
        top: `${top}px`,
        width: `${popoverWidth}px`,
        zIndex: 60,
      }}
      className="bg-white rounded-lg shadow-xl border border-neutral-200 text-xs overflow-hidden select-none animate-in fade-in-0 zoom-in-95 duration-100"
    >
      {/* Header */}
      <div className="p-2.5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/80">
        <div className="flex items-center gap-1.5 font-semibold text-neutral-800">
          <Gauge className="w-3.5 h-3.5 text-indigo-600" />
          <span>测速与容差参数配置</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/50 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Inputs */}
      <div className="p-3 space-y-3 bg-white">
        {/* Interval */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-medium text-neutral-700">测速间隔 (interval)</label>
            <span className="text-[10px] text-neutral-400">秒 (默认 600s)</span>
          </div>
          <input
            type="number"
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
            placeholder="600"
            className="w-full px-2 py-1 text-xs border border-neutral-200 rounded focus:border-indigo-500 focus:outline-none"
          />
          <div className="flex items-center gap-1 mt-1">
            {['300', '600', '1200'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setInterval(preset)}
                className={`text-[10px] px-1.5 py-0.5 rounded border ${
                  interval === preset
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-medium'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-500 hover:bg-neutral-100'
                }`}
              >
                {preset}s
              </button>
            ))}
          </div>
        </div>

        {/* Tolerance */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-medium text-neutral-700">容差 (tolerance)</label>
            <span className="text-[10px] text-neutral-400">毫秒 (默认 50ms)</span>
          </div>
          <input
            type="number"
            value={tolerance}
            onChange={(e) => setTolerance(e.target.value)}
            placeholder="50"
            className="w-full px-2 py-1 text-xs border border-neutral-200 rounded focus:border-indigo-500 focus:outline-none"
          />
          <div className="flex items-center gap-1 mt-1">
            {['20', '50', '100'].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setTolerance(preset)}
                className={`text-[10px] px-1.5 py-0.5 rounded border ${
                  tolerance === preset
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-medium'
                    : 'bg-neutral-50 border-neutral-200 text-neutral-500 hover:bg-neutral-100'
                }`}
              >
                {preset}ms
              </button>
            ))}
          </div>
        </div>

        {/* URL */}
        <div>
          <label className="block font-medium text-neutral-700 mb-1">
            测速测试地址 (url)
          </label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="http://cp.cloudflare.com/generate_204"
            className="w-full px-2 py-1 text-xs border border-neutral-200 rounded focus:border-indigo-500 focus:outline-none truncate"
          />
          <div className="flex items-center gap-1 mt-1">
            <button
              type="button"
              onClick={() => setUrl('http://cp.cloudflare.com/generate_204')}
              className="text-[10px] px-1.5 py-0.5 rounded border bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100 truncate max-w-[140px]"
              title="Cloudflare 204"
            >
              Cloudflare 204
            </button>
            <button
              type="button"
              onClick={() => setUrl('http://www.gstatic.com/generate_204')}
              className="text-[10px] px-1.5 py-0.5 rounded border bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100 truncate max-w-[140px]"
              title="Google gstatic 204"
            >
              Google 204
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-2.5 border-t border-neutral-100 bg-neutral-50 flex items-center justify-between">
        <button
          type="button"
          onClick={handleClear}
          className="text-[11px] text-neutral-400 hover:text-red-600 flex items-center gap-1 cursor-pointer"
          title="清空当前测速参数"
        >
          <RotateCcw className="w-3 h-3" />
          <span>清空</span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onClose}
            className="px-2 py-1 text-[11px] rounded border border-neutral-200 text-neutral-600 hover:bg-neutral-100 cursor-pointer"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-2.5 py-1 text-[11px] font-medium rounded bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-1 cursor-pointer shadow-2xs"
          >
            <Check className="w-3 h-3" />
            <span>保存</span>
          </button>
        </div>
      </div>
    </div>
  );
};
