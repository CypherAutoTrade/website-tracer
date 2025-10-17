"use client";

import { History as HistoryIcon, Trash2, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HistoryItem } from "@/hooks/useHistory";

interface HistoryProps {
  history: HistoryItem[];
  onRestore: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
}

export function History({ history, onRestore, onDelete, onClear }: HistoryProps) {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card className="h-full bg-white/80 backdrop-blur-xl border border-zinc-200 shadow-2xl">
      <div className="p-4 border-b border-zinc-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HistoryIcon className="w-5 h-5" />
          <h3 className="font-bold font-mono">HISTORY</h3>
        </div>
        {history.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-xs font-mono hover:bg-zinc-100"
          >
            CLEAR ALL
          </Button>
        )}
      </div>

      <ScrollArea className="h-[calc(100%-60px)]">
        {history.length === 0 ? (
          <div className="p-8 text-center text-zinc-400">
            <Clock className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-mono">No history yet</p>
            <p className="text-xs mt-1">Analyze a website to start</p>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {history.map((item) => (
              <Card
                key={item.id}
                className="p-3 hover:bg-zinc-50 transition-all cursor-pointer border border-zinc-200 hover:border-zinc-300"
                onClick={() => onRestore(item)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono font-semibold truncate">
                      {item.url}
                    </p>
                    <p className="text-xs text-zinc-500 font-mono mt-1">
                      {formatDate(item.timestamp)}
                    </p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-xs bg-zinc-100 px-2 py-1 rounded font-mono">
                        HTML: {item.templateHtml.length}
                      </span>
                      <span className="text-xs bg-zinc-100 px-2 py-1 rounded font-mono">
                        CSS: {item.templateCss.length}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(item.id);
                    }}
                    className="hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
}
