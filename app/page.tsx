"use client";

import { useState, useEffect, useRef } from "react";
import { CodeEditor } from "@/components/CodeEditor";
import { Preview } from "@/components/Preview";
import { History } from "@/components/History";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ExternalLink, Code2, Terminal, Zap, Upload } from "lucide-react";
import { gsap } from "gsap";
import { useHistory, HistoryItem } from "@/hooks/useHistory";

export default function Home() {
  const [htmlCode, setHtmlCode] = useState("");
  const [cssCode, setCssCode] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [templateHtml, setTemplateHtml] = useState("");
  const [templateCss, setTemplateCss] = useState("");

  const { history, addToHistory, removeFromHistory, clearHistory } = useHistory();

  const headerRef = useRef<HTMLDivElement>(null);
  const urlCardRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // 背景アニメーションエフェクト
    const createFloatingDots = () => {
      const container = document.querySelector('.floating-dots');
      if (!container) return;

      for (let i = 0; i < 20; i++) {
        const dot = document.createElement('div');
        dot.className = 'floating-dot';
        dot.style.left = `${Math.random() * 100}%`;
        dot.style.top = `${Math.random() * 100}%`;
        dot.style.animationDelay = `${Math.random() * 5}s`;
        container.appendChild(dot);
      }
    };
    createFloatingDots();

    // ヘッダーのアニメーション
    if (headerRef.current) {
      gsap.fromTo(
        headerRef.current,
        { y: -100, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 1,
          ease: "power4.out",
          onComplete: () => {
            gsap.to(headerRef.current, {
              boxShadow: "0 4px 30px rgba(0,0,0,0.1)",
              duration: 0.5
            });
          }
        }
      );
    }

    // URL入力カードのアニメーション
    if (urlCardRef.current) {
      gsap.fromTo(
        urlCardRef.current,
        { y: 50, opacity: 0, scale: 0.9 },
        {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.8,
          delay: 0.3,
          ease: "back.out(1.4)"
        }
      );
    }

    // エディタとプレビューのアニメーション
    if (editorRef.current && previewRef.current) {
      gsap.fromTo(
        [editorRef.current, previewRef.current],
        { y: 100, opacity: 0, rotateX: -15 },
        {
          y: 0,
          opacity: 1,
          rotateX: 0,
          duration: 1,
          delay: 0.6,
          stagger: 0.2,
          ease: "power3.out"
        }
      );
    }
  }, []);

  // ファイル読み込み処理
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      let htmlContent = templateHtml || ""; // 既存のHTMLを保持（初期値は空文字列）
      let cssContent = templateCss || "";   // 既存のCSSを保持（初期値は空文字列）
      let fileName = "";
      let fileNames: string[] = [];

      // HTMLファイルとCSSファイルを読み込む
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const content = await file.text();

        if (file.name.endsWith('.html') || file.name.endsWith('.htm')) {
          htmlContent = content;
          fileNames.push(file.name);

          // HTMLからCSSを抽出
          const styleMatch = content.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
          if (styleMatch) {
            cssContent = styleMatch[1].trim();
            htmlContent = content.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
          }
        } else if (file.name.endsWith('.css')) {
          cssContent = content;
          fileNames.push(file.name);
        }
      }

      // ファイル名を決定
      fileName = fileNames.join(' + ') || 'Uploaded File';

      if (htmlContent || cssContent) {
        setTemplateHtml(htmlContent);
        setTemplateCss(cssContent);
        setHtmlCode("");
        setCssCode("");
        setAnalysisError(""); // エラーをクリア

        // 履歴に保存
        console.log("Adding to history:", {
          url: `📁 ${fileName}`,
          htmlLength: htmlContent.length,
          cssLength: cssContent.length
        });

        const historyId = addToHistory({
          url: `📁 ${fileName}`,
          templateHtml: htmlContent,
          templateCss: cssContent,
          userHtml: "",
          userCss: "",
        });

        console.log("History ID:", historyId);
        console.log("Current history length:", history.length);

        // 成功アニメーション
        if (editorRef.current) {
          gsap.fromTo(
            editorRef.current,
            { scale: 0.95, opacity: 0.5 },
            { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.7)" }
          );
        }
      } else {
        setAnalysisError("HTMLまたはCSSファイルを選択してください");
      }
    } catch (error) {
      setAnalysisError("ファイルの読み込みに失敗しました");
      console.error(error);
    }

    // ファイル入力をリセット
    if (event.target) {
      event.target.value = "";
    }
  };

  const analyzeUrl = async () => {
    if (!customUrl) {
      setAnalysisError("URLを入力してください");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError("");

    // アニメーション: ローディング中のパルス効果
    if (urlCardRef.current) {
      gsap.to(urlCardRef.current, {
        scale: 1.02,
        duration: 0.5,
        yoyo: true,
        repeat: -1,
        ease: "power1.inOut"
      });
    }

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: customUrl }),
      });

      const data = await response.json();

      if (data.success && data.html) {
        const fullCode = data.html;
        const styleMatch = fullCode.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
        const extractedCss = styleMatch ? styleMatch[1].trim() : "";
        const htmlWithoutStyle = fullCode.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");

        setTemplateHtml(htmlWithoutStyle);
        setTemplateCss(extractedCss);
        setHtmlCode("");
        setCssCode("");

        // 履歴に保存
        addToHistory({
          url: customUrl,
          templateHtml: htmlWithoutStyle,
          templateCss: extractedCss,
          userHtml: "",
          userCss: "",
        });

        // 成功アニメーション
        if (editorRef.current) {
          gsap.fromTo(
            editorRef.current,
            { scale: 0.95, opacity: 0.5 },
            { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.7)" }
          );
        }
      } else {
        setAnalysisError(data.error || "分析に失敗しました");
      }
    } catch (error) {
      setAnalysisError("エラーが発生しました。もう一度お試しください。");
      console.error(error);
    } finally {
      setIsAnalyzing(false);

      // ローディングアニメーション停止
      if (urlCardRef.current) {
        gsap.killTweensOf(urlCardRef.current);
        gsap.to(urlCardRef.current, { scale: 1, duration: 0.3 });
      }
    }
  };

  const getCombinedCode = (html: string, css: string) => {
    if (!html && !css) return "";

    // HTMLがない場合、何も返さない
    if (!html) return "";

    // CSSがない場合はHTMLだけ返す
    if (!css) return html;

    // CSSをHTMLに埋め込む
    if (html.includes("</head>")) {
      return html.replace("</head>", `<style>${css}</style></head>`);
    } else if (html.includes("<head>")) {
      return html.replace("<head>", `<head><style>${css}</style>`);
    } else {
      return `<!DOCTYPE html><html><head><style>${css}</style></head><body>${html}</body></html>`;
    }
  };

  // 履歴から復元
  const restoreFromHistory = (item: HistoryItem) => {
    setCustomUrl(item.url);
    setTemplateHtml(item.templateHtml);
    setTemplateCss(item.templateCss);
    setHtmlCode(item.userHtml);
    setCssCode(item.userCss);
    setAnalysisError("");

    // 復元アニメーション
    if (editorRef.current) {
      gsap.fromTo(
        editorRef.current,
        { scale: 0.95, opacity: 0.5 },
        { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.7)" }
      );
    }
  };

  return (
    <div className="min-h-screen bg-white text-black relative overflow-hidden">
      {/* 背景アニメーション */}
      <div className="floating-dots fixed inset-0 pointer-events-none" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0.03),transparent_50%)] pointer-events-none" />

      {/* グリッド背景 */}
      <div className="fixed inset-0 bg-[linear-gradient(rgba(0,0,0,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.05)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none" />

      {/* ヘッダー */}
      <header
        ref={headerRef}
        className="bg-white/80 backdrop-blur-xl border-b border-zinc-200 sticky top-0 z-50 shadow-sm"
      >
        <div className="max-w-screen-2xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-black blur-xl opacity-20 animate-pulse" />
                <div className="relative w-12 h-12 bg-gradient-to-br from-black to-zinc-600 rounded-lg flex items-center justify-center shadow-2xl transform hover:scale-110 transition-transform duration-300">
                  <Code2 className="w-7 h-7 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight">
                  <span className="bg-gradient-to-r from-black to-zinc-600 bg-clip-text text-transparent">
                    CODE
                  </span>
                  <span className="text-zinc-400"> TRACE</span>
                </h1>
                <p className="text-xs text-zinc-500 font-mono">AI-Powered Learning Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 bg-black text-white text-xs rounded-full font-bold tracking-wide animate-pulse">
                AI ENABLED
              </div>
              <Terminal className="w-5 h-5 text-zinc-600 animate-pulse" />
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <div className="max-w-full mx-auto p-4 relative z-10">
        {/* AI ANALYZER & HISTORY 統合カード */}
        <Card
          ref={urlCardRef}
          className="mb-4 p-4 bg-white/80 backdrop-blur-xl border border-zinc-200 shadow-2xl hover:border-zinc-300 transition-all duration-300"
        >
          <div className="space-y-4">
            {/* AI ANALYZER */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-5 h-5 text-black animate-pulse" />
                <h2 className="text-lg font-black tracking-tight">
                  AI WEBSITE ANALYZER
                </h2>
              </div>

              <div className="flex gap-3 flex-wrap">
                <input
                  type="url"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="flex-1 min-w-[250px] px-3 py-2 bg-white border-2 border-zinc-200 rounded-lg focus:outline-none focus:border-black transition-all text-black placeholder:text-zinc-400 font-mono text-sm"
                  disabled={isAnalyzing}
                />
                <Button
                  onClick={analyzeUrl}
                  disabled={isAnalyzing}
                  className="bg-black text-white hover:bg-zinc-800 font-bold px-6 shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ANALYZING...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      ANALYZE
                    </>
                  )}
                </Button>

                {/* ファイルアップロードボタン */}
                <div className="relative">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".html,.htm,.css"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="border-2 border-zinc-200 hover:border-black font-bold px-6 shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    FILE
                  </Button>
                </div>
              </div>

              {analysisError && (
                <div className="bg-red-50 border-2 border-red-300 text-red-700 p-2 rounded-lg text-xs font-mono animate-pulse mt-3">
                  ERROR: {analysisError}
                </div>
              )}
            </div>

            {/* HISTORY */}
            <div className="h-[100px] border-t border-zinc-200 pt-4">
              <History
                history={history}
                onRestore={restoreFromHistory}
                onDelete={removeFromHistory}
                onClear={clearHistory}
              />
            </div>
          </div>
        </Card>

        {/* エディタ & プレビュー 統合カード - 大画面表示 */}
        <Card
          ref={editorRef}
          className="h-[calc(100vh-200px)] min-h-[700px] overflow-hidden bg-white/80 backdrop-blur-xl border border-zinc-200 shadow-2xl hover:border-zinc-300 transition-all duration-300"
        >
          <div className="grid lg:grid-cols-2 gap-0 h-full">
            {/* 左側: コードエディタ (HTML & CSS) */}
            <div className="h-full border-r border-zinc-200">
              <Tabs defaultValue="html" className="h-full flex flex-col">
                <div className="p-4 border-b border-zinc-200">
                  <h3 className="text-sm font-black tracking-tight mb-3 text-zinc-700">CODE EDITOR</h3>
                  <TabsList className="grid w-full grid-cols-2 bg-zinc-100 border border-zinc-200">
                    <TabsTrigger
                      value="html"
                      className="data-[state=active]:bg-black data-[state=active]:text-white font-mono font-bold"
                    >
                      HTML
                    </TabsTrigger>
                    <TabsTrigger
                      value="css"
                      className="data-[state=active]:bg-black data-[state=active]:text-white font-mono font-bold"
                    >
                      CSS
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="html" className="flex-1 m-0 h-[calc(100%-120px)]">
                  <CodeEditor
                    templateCode={templateHtml || "<!-- AI will generate template HTML here -->"}
                    onChange={setHtmlCode}
                    language="html"
                  />
                </TabsContent>

                <TabsContent value="css" className="flex-1 m-0 h-[calc(100%-120px)]">
                  <CodeEditor
                    templateCode={templateCss || "/* AI will generate template CSS here */"}
                    onChange={setCssCode}
                    language="css"
                  />
                </TabsContent>
              </Tabs>
            </div>

            {/* 右側: プレビュー (TEMPLATE & YOUR CODE) */}
            <div className="h-full" ref={previewRef}>
              <Tabs defaultValue="template" className="h-full flex flex-col">
                <div className="p-4 border-b border-zinc-200">
                  <h3 className="text-sm font-black tracking-tight mb-3 text-zinc-700">PREVIEW</h3>
                  <TabsList className="grid w-full grid-cols-2 bg-zinc-100 border border-zinc-200">
                    <TabsTrigger
                      value="template"
                      className="data-[state=active]:bg-black data-[state=active]:text-white font-mono font-bold"
                    >
                      TEMPLATE
                    </TabsTrigger>
                    <TabsTrigger
                      value="user"
                      className="data-[state=active]:bg-black data-[state=active]:text-white font-mono font-bold"
                    >
                      YOUR CODE
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="template" className="flex-1 m-0 h-[calc(100%-120px)]">
                  <Preview code={getCombinedCode(templateHtml, templateCss)} />
                </TabsContent>

                <TabsContent value="user" className="flex-1 m-0 h-[calc(100%-120px)]">
                  <Preview code={getCombinedCode(htmlCode, cssCode)} />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </Card>
      </div>

      <style jsx global>{`
        .floating-dot {
          position: absolute;
          width: 2px;
          height: 2px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 50%;
          animation: float 10s infinite ease-in-out;
        }

        @keyframes float {
          0%, 100% {
            transform: translate(0, 0);
            opacity: 0;
          }
          50% {
            transform: translate(50px, -50px);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
