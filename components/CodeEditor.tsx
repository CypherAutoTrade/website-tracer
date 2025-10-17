"use client";

import { useEffect, useRef, useState } from "react";

interface CodeEditorProps {
  templateCode: string;
  onChange: (code: string) => void;
  language?: "html" | "css" | "javascript";
}

export function CodeEditor({
  templateCode,
  onChange,
  language = "html",
}: CodeEditorProps) {
  const [code, setCode] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [code]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    setCode(newCode);
    onChange(newCode);
  };

  return (
    <div className="relative h-full overflow-auto bg-zinc-50 border-t border-zinc-200">
      {/* お手本コード（背景に薄く表示） */}
      {!code && (
        <pre className="absolute top-0 left-0 w-full p-4 pl-16 text-zinc-300 font-mono text-sm pointer-events-none whitespace-pre-wrap leading-relaxed">
          {templateCode}
        </pre>
      )}

      {/* ユーザー入力エリア */}
      <textarea
        ref={textareaRef}
        value={code}
        onChange={handleChange}
        className="w-full h-full p-4 pl-16 font-mono text-sm bg-transparent resize-none focus:outline-none leading-relaxed text-black caret-black selection:bg-black selection:text-white"
        placeholder="// Start typing..."
        spellCheck={false}
      />

      {/* 行番号風の装飾 */}
      <div className="absolute top-0 left-0 w-12 h-full bg-zinc-100 border-r border-zinc-200 pointer-events-none" />
    </div>
  );
}
