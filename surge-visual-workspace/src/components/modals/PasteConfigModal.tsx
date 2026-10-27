import React, { useState, useMemo } from 'react';
import { X, ClipboardPaste, ArrowRight, Sparkles, Check, Trash2 } from 'lucide-react';

interface PasteConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (content: string, fileName?: string) => void;
}

export const PasteConfigModal: React.FC<PasteConfigModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  const [text, setText] = useState<string>('');
  const [profileName, setProfileName] = useState<string>('Surge-Peng.conf');
  const [autoPasted, setAutoPasted] = useState<boolean>(false);

  const linesCount = useMemo(() => (text ? text.split(/\r?\n/).length : 0), [text]);
  const hasProxyGroup = useMemo(() => text.includes('[Proxy Group]'), [text]);
  const hasRule = useMemo(() => text.includes('[Rule]'), [text]);

  const handlePasteFromClipboard = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText) {
        setText(clipboardText);
        setAutoPasted(true);
        setTimeout(() => setAutoPasted(false), 2000);
      }
    } catch (e) {
      console.warn('Clipboard read permission denied or not supported', e);
    }
  };

  const handleApply = () => {
    if (!text.trim()) {
      alert('请输入或粘贴 Surge 配置文件内容');
      return;
    }
    onConfirm(text, profileName.trim() || 'Surge-Peng.conf');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 select-none animate-in fade-in duration-150">
      <div className="w-[720px] max-w-full h-[560px] max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col border border-[#e9e9e7] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#e9e9e7] flex items-center justify-between bg-[#fcfcfb]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-600">
              <ClipboardPaste className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-sm text-neutral-800">
                粘贴 Surge 配置文件文本
              </h2>
              <p className="text-[11px] text-neutral-500">
                支持直接在下方输入框中粘贴全文，无任何系统目录权限与路径限制
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Top bar with quick name and clipboard read */}
        <div className="px-5 py-2.5 border-b border-[#f0f0ee] bg-white flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-neutral-500">配置文件名:</span>
            <input
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              className="h-7 px-2 border border-neutral-200 rounded text-neutral-700 focus:outline-indigo-500 font-medium"
              placeholder="Surge-Peng.conf"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePasteFromClipboard}
              className="h-7 px-2.5 rounded text-xs font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-700 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {autoPasted ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              )}
              <span>{autoPasted ? '已从剪贴板读取' : '读取剪贴板'}</span>
            </button>

            {text && (
              <button
                onClick={() => setText('')}
                className="h-7 px-2 rounded text-xs text-neutral-400 hover:text-red-600 hover:bg-red-50 flex items-center gap-1 cursor-pointer"
                title="清空内容"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>清空</span>
              </button>
            )}
          </div>
        </div>

        {/* Textarea Area */}
        <div className="flex-1 p-4 bg-[#fafafa] flex flex-col min-h-0">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`在此处直接按 Cmd + V 粘贴完整的 Surge 配置文件文本，例如：

[General]
loglevel = notify

[Proxy Group]
💬 AI = select, "♻️ Tier1-Auto", "🏗️ Tier1-Select"
♻️ Tier1-Auto = url-test, interval=1800, tolerance=88

[Rule]
PROCESS-NAME,/Applications/ChatGPT.app/,"💬 AI"
DOMAIN-SUFFIX,openai.com,"💬 AI"
FINAL,DIRECT
`}
            className="flex-1 w-full p-3 font-mono text-[11px] leading-relaxed bg-white border border-neutral-200 rounded-lg focus:border-indigo-500 focus:outline-none resize-none text-neutral-800"
            autoFocus
          />

          {/* Validation tags footer */}
          <div className="mt-2 flex items-center justify-between text-[11px] text-neutral-500 px-1">
            <div className="flex items-center gap-3">
              <span>共计: {linesCount} 行 / {text.length} 字符</span>
              {hasProxyGroup && (
                <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-medium">
                  ✓ 检测到 [Proxy Group]
                </span>
              )}
              {hasRule && (
                <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-medium">
                  ✓ 检测到 [Rule]
                </span>
              )}
            </div>
            <span className="italic text-neutral-400">零权限要求 · 本地即时解析</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#e9e9e7] bg-[#fcfcfb] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-md text-xs font-medium text-neutral-600 hover:bg-neutral-100 border border-neutral-200 cursor-pointer"
          >
            取消
          </button>
          <button
            disabled={!text.trim()}
            onClick={handleApply}
            className="px-4 py-1.5 rounded-md text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <span>解析并载入配置</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
