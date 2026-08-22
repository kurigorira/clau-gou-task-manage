"use client";

/**
 * ニュースウィジェット。GoogleニュースのRSSをCORSプロキシ経由で取得して見出しを表示する。
 * 静的サイトのため外部プロキシ（allorigins）を利用。失敗時は控えめに案内する。
 */

import { useCallback, useEffect, useState } from "react";

const FEED_URL = "https://news.google.com/rss?hl=ja&gl=JP&ceid=JP:ja";
const proxied = (url: string) =>
  `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;

interface NewsItem {
  title: string;
  link: string;
  source: string;
  pubDate: string;
}

function relativeTime(dateStr: string): string {
  const t = new Date(dateStr).getTime();
  if (Number.isNaN(t)) return "";
  const diffMin = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (diffMin < 60) return `${diffMin}分前`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `${diffH}時間前`;
  return `${Math.round(diffH / 24)}日前`;
}

export function NewsWidget() {
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch(proxied(FEED_URL))
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then((xml) => {
        const doc = new DOMParser().parseFromString(xml, "text/xml");
        const parsed = Array.from(doc.querySelectorAll("item"))
          .slice(0, 6)
          .map((item) => ({
            title: item.querySelector("title")?.textContent ?? "",
            link: item.querySelector("link")?.textContent ?? "",
            source: item.querySelector("source")?.textContent ?? "",
            pubDate: item.querySelector("pubDate")?.textContent ?? "",
          }))
          .filter((i) => i.title && i.link);
        if (parsed.length === 0) throw new Error("empty");
        setItems(parsed);
      })
      .catch(() => setError("ニュースを取得できませんでした。時間をおいて再試行してください。"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="card p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-900">📰 最新ニュース</h2>
        <button
          onClick={load}
          disabled={loading}
          className="rounded-lg px-2 py-1 text-sm text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          title="更新"
        >
          {loading ? "…" : "↻"}
        </button>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-slate-400">{error}</p>
      ) : !items ? (
        <p className="mt-4 text-sm text-slate-400">読み込み中...</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {items.map((item, i) => (
            <li key={i}>
              <a
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block py-2 hover:bg-brand-50/50"
              >
                <p className="line-clamp-2 text-sm font-medium leading-snug text-slate-800">
                  {item.title}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {item.source}
                  {item.pubDate && ` ・ ${relativeTime(item.pubDate)}`}
                </p>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
