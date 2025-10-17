"use client";

import { useEffect, useRef, useState, useMemo } from "react";

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd, value } = textarea;

    // タブキーでインデント挿入
    if (e.key === 'Tab') {
      e.preventDefault();
      const newValue = value.substring(0, selectionStart) + '  ' + value.substring(selectionEnd);
      setCode(newValue);
      onChange(newValue);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + 2;
      }, 0);
      return;
    }

    // Enterキーで自動インデント
    if (e.key === 'Enter') {
      e.preventDefault();
      const currentLineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
      const currentLine = value.substring(currentLineStart, selectionStart);
      const indent = currentLine.match(/^\s*/)?.[0] || '';

      // 前の行が開きタグで終わっている場合、インデントを追加
      const extraIndent = currentLine.trim().match(/<[^/][^>]*>$/) ? '  ' : '';

      const newValue = value.substring(0, selectionStart) + '\n' + indent + extraIndent + value.substring(selectionEnd);
      setCode(newValue);
      onChange(newValue);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + 1 + indent.length + extraIndent.length;
      }, 0);
      return;
    }

    // ペア入力: 引用符、括弧など
    const pairs: Record<string, string> = {
      '"': '"',
      "'": "'",
      '(': ')',
      '{': '}',
      '[': ']',
    };

    if (pairs[e.key]) {
      e.preventDefault();
      const closeChar = pairs[e.key];
      const newValue = value.substring(0, selectionStart) + e.key + closeChar + value.substring(selectionEnd);
      setCode(newValue);
      onChange(newValue);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
      }, 0);
      return;
    }

    // タグの自動閉じ: > を入力したときに閉じタグを自動追加
    if (e.key === '>') {
      const beforeCursor = value.substring(0, selectionStart);

      // 開きタグのパターンをチェック（自己閉じタグと閉じタグは除外）
      const tagMatch = beforeCursor.match(/<([a-zA-Z][a-zA-Z0-9]*)[^>]*$/);

      if (tagMatch && !beforeCursor.endsWith('/')) {
        const tagName = tagMatch[1];

        // 自己閉じタグのリスト
        const selfClosingTags = ['img', 'br', 'hr', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'source', 'track', 'wbr'];

        if (!selfClosingTags.includes(tagName.toLowerCase())) {
          e.preventDefault();
          const newValue = value.substring(0, selectionStart) + '></' + tagName + '>' + value.substring(selectionEnd);
          setCode(newValue);
          onChange(newValue);

          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
          }, 0);
          return;
        }
      }
    }
  };

  // ユーザーが入力した文字数分だけ空白にして、残りのテンプレートを表示
  const displayTemplate = useMemo(() => {
    if (!code) return templateCode;

    const userLines = code.split('\n');
    const templateLines = templateCode.split('\n');

    return templateLines.map((templateLine, index) => {
      const userLine = userLines[index] || '';

      // ユーザーが入力した文字数分を空白に置き換え、残りはテンプレートを表示
      if (userLine.length > 0) {
        const spaces = ' '.repeat(userLine.length);
        return spaces + templateLine.slice(userLine.length);
      }

      // 未入力の行はテンプレートをそのまま表示
      return templateLine;
    }).join('\n');
  }, [code, templateCode]);

  // ユーザーの入力を色分けして表示（正解は黒、間違いは赤）
  const coloredUserCode = useMemo(() => {
    if (!code) return null;

    const userLines = code.split('\n');
    const templateLines = templateCode.split('\n');

    return userLines.map((userLine, lineIndex) => {
      const templateLine = templateLines[lineIndex] || '';
      const chars = userLine.split('');

      return (
        <div key={lineIndex}>
          {chars.map((char, charIndex) => {
            const isCorrect = char === templateLine[charIndex];
            return (
              <span
                key={charIndex}
                className={isCorrect ? 'text-black' : 'text-red-500'}
              >
                {char}
              </span>
            );
          })}
        </div>
      );
    });
  }, [code, templateCode]);

  return (
    <div className="relative h-full overflow-auto bg-zinc-50 border-t border-zinc-200">
      {/* お手本コード（背景に薄く表示） - 未入力部分のみ表示 */}
      <pre className="absolute top-0 left-0 w-full p-4 pl-16 text-zinc-300 font-mono text-sm pointer-events-none whitespace-pre-wrap leading-relaxed z-0">
        {displayTemplate}
      </pre>

      {/* ユーザー入力の色付き表示（正解=黒、間違い=赤） */}
      {coloredUserCode && (
        <div className="absolute top-0 left-0 w-full p-4 pl-16 font-mono text-sm pointer-events-none whitespace-pre-wrap leading-relaxed z-5">
          {coloredUserCode}
        </div>
      )}

      {/* ユーザー入力エリア（透明） */}
      <textarea
        ref={textareaRef}
        value={code}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className="relative z-10 w-full h-full p-4 pl-16 font-mono text-sm bg-transparent resize-none focus:outline-none leading-relaxed text-transparent caret-black selection:bg-black selection:text-white"
        placeholder="// Start typing..."
        spellCheck={false}
      />

      {/* 行番号風の装飾 */}
      <div className="absolute top-0 left-0 w-12 h-full bg-zinc-100 border-r border-zinc-200 pointer-events-none z-20" />
    </div>
  );
}
