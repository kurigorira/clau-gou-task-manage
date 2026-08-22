"use client";

/**
 * ニュースウィジェット。GoogleニュースのRSSを複数の経路で順に試して取得する。
 * 静的サイトのためCORS対応の中継サービスを利用（1つが落ちていても次で取れる）。
 */

import { useCallback, useEffect, useState } from "react";

const FEED_URL = "https://news.google.com/rss?hl=ja&gl=JP&ceid=JP:ja";

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

/** タイムアウト付きfetch。 */
async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Googleニュースの見出しは「タイトル - 媒体名」形式なので分離する。 */
function splitTitle(raw: string): { title: string; source: string } {
  const idx = raw.lastIndexOf(" - ");
  if (idx > 10) return { title: raw.slice(0, idx), source: raw.slice(idx + 3) };
  return { title: raw, source: "" };
}

/** 経路1: rss2json（JSONで返る・高速）。 */
async function viaRss2json(): Promise<NewsItem[]> {
  const res = await fetchWithTimeout(
    `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(FEED_URL)}`,
    8000,
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.status !== "ok" || !Array.isArray(data.items)) throw new Error("bad payload");
  return data.items.slice(0, 6).map((it: { title: string; link: string; pubDate: string }) => {
    const { title, source } = splitTitle(it.title ?? "");
    return { title, source, link: it.link ?? "", pubDate: it.pubDate ?? "" };
  });
}

/** 経路2/3: CORSプロキシ経由でRSS(XML)を取得してパース。 */
async function viaXmlProxy(proxyUrl: string): Promise<NewsItem[]> {
  const res = await fetchWithTimeout(proxyUrl, 10000);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  const items = Array.from(doc.querySelectorAll("item"))
    .slice(0, 6)
    .map((item) => {
      const raw = item.querySelector("title")?.textContent ?? "";
      const { title, source } = splitTitle(raw);
      return {
        title,
        source: item.querySelector("source")?.textContent ?? source,
        link: item.querySelector("link")?.textContent ?? "",
        pubDate: item.querySelector("pubDate")?.textContent ?? "",
      };
    })
    .filter((i) => i.title && i.link);
  if (items.length === 0) throw new Error("empty");
  return items;
}

const SOURCES: (() => Promise<NewsItem[]>)[] = [
  viaRss2json,
  () => viaXmlProxy(`https://api.allorigins.win/raw?url=${encodeURIComponent(FEED_URL)}`),
  () => viaXmlProxy(`https://corsproxy.io/?url=${encodeURIComponent(FEED_URL)}`),
];

export function NewsWidget() {
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    for (const source of SOURCES) {
      try {
        const result = await source();
        setItems(result);
        setLoading(false);
        return;
      } catch {
        // 次の経路を試す。
      }
    }
    setError("ニュースを取得できませんでした。↻で再試行してください。");
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="card p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-900">📰 最新ニュース</h2>
        <button
          onClick={() => void load()}
          disabled={loading}
          className="rounded-lg px-2 py-1 text-sm text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          title="更新"
        >
          {loading ? "…" : "↻"}
        </button>
      </div>

      {loading && !items ? (
        <p className="mt-4 text-sm text-slate-400">読み込み中...</p>
      ) : error && !items ? (
        <p className="mt-4 text-sm text-slate-400">{error}</p>
      ) : items ? (
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
      ) : null}
    </section>
  );
}
