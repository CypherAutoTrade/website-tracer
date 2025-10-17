import { useState, useEffect } from "react";

export interface HistoryItem {
  id: string;
  url: string;
  timestamp: number;
  templateHtml: string;
  templateCss: string;
  userHtml: string;
  userCss: string;
}

const HISTORY_KEY = "code-trace-history";
const MAX_HISTORY = 20;

export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // LocalStorageから履歴を読み込み
  useEffect(() => {
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setHistory(parsed);
      }
    } catch (error) {
      console.error("Failed to load history:", error);
    }
  }, []);

  // 履歴に追加
  const addToHistory = (item: Omit<HistoryItem, "id" | "timestamp">) => {
    const newItem: HistoryItem = {
      ...item,
      id: Date.now().toString(),
      timestamp: Date.now(),
    };

    setHistory((prev) => {
      const updated = [newItem, ...prev].slice(0, MAX_HISTORY);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error("Failed to save history:", error);
      }
      return updated;
    });

    return newItem.id;
  };

  // 履歴から削除
  const removeFromHistory = (id: string) => {
    setHistory((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error("Failed to save history:", error);
      }
      return updated;
    });
  };

  // 履歴をクリア
  const clearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch (error) {
      console.error("Failed to clear history:", error);
    }
  };

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
  };
}
