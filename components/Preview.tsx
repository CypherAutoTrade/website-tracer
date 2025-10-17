"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Eye, EyeOff } from "lucide-react";

interface PreviewProps {
  code: string;
}

export function Preview({ code }: PreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [cssEnabled, setCssEnabled] = useState(true);

  useEffect(() => {
    if (iframeRef.current) {
      const iframe = iframeRef.current;
      const document = iframe.contentDocument;

      if (document) {
        let displayCode = code;

        // CSSが無効の場合、<style>タグを削除
        if (!cssEnabled) {
          displayCode = code.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
        }

        document.open();
        document.write(displayCode);
        document.close();
      }
    }
  }, [code, cssEnabled]);

  return (
    <div className="h-full bg-white overflow-auto border-t border-zinc-200 relative">
      {/* CSS トグルボタン */}
      <div className="absolute top-2 right-2 z-10">
        <Button
          onClick={() => setCssEnabled(!cssEnabled)}
          size="sm"
          className={`backdrop-blur-sm border-2 transition-all shadow-lg font-mono text-xs font-bold ${
            cssEnabled
              ? 'bg-black text-white border-black hover:bg-zinc-800'
              : 'bg-white text-black border-zinc-300 hover:border-black'
          }`}
        >
          {cssEnabled ? (
            <>
              <Eye className="w-3 h-3 mr-1" />
              CSS ON
            </>
          ) : (
            <>
              <EyeOff className="w-3 h-3 mr-1" />
              CSS OFF
            </>
          )}
        </Button>
      </div>

      <iframe
        ref={iframeRef}
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin allow-forms"
        title="Preview"
      />
      {!code && (
        <div className="absolute inset-0 flex items-center justify-center text-zinc-400 font-mono text-sm">
          Preview will appear here
        </div>
      )}
      {/* プレビューオーバーレイ効果 */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-black to-transparent opacity-10 animate-pulse" />
    </div>
  );
}
