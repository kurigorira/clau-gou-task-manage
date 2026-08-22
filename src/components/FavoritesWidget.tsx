"use client";

/**
 * お気に入りサイトのリンク集ウィジェット。localStorage に保存する。
 */

import { useEffect, useState } from "react";

interface Favorite {
  id: string;
  label: string;
  url: string;
}

const KEY = "atlas-favorites-v1";

function createId(): string {
  return `fav-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

export function FavoritesWidget() {
  const [items, setItems] = useState<Favorite[]>([]);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw) as Favorite[]);
    } catch {
      /* noop */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(items));
    } catch {
      /* noop */
    }
  }, [items, ready]);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    let u = url.trim();
    if (!u) return;
    if (!/^https?:\/\//.test(u)) u = `https://${u}`;
    setItems((prev) => [...prev, { id: createId(), label: label.trim(), url: u }]);
    setLabel("");
    setUrl("");
  };

  return (
    <section className="card p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-900">⭐ お気に入り</h2>
        {items.length > 0 && (
          <button
            onClick={() => setEditing((v) => !v)}
            className="rounded-lg px-2 py-1 text-sm text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            {editing ? "完了" : "編集"}
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">
          よく見るサイトを登録しておくと、ここからすぐ開けます。
        </p>
      ) : (
        <ul className="mt-3 flex flex-wrap gap-2">
          {items.map((f) => (
            <li key={f.id} className="flex items-center">
              <a
                href={f.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white py-1.5 pl-2.5 pr-3 text-sm text-slate-700 shadow-sm transition hover:border-brand-300 hover:text-brand-700"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://www.google.com/s2/favicons?domain=${hostOf(f.url)}&sz=32`}
                  alt=""
                  width={16}
                  height={16}
                  className="rounded-sm"
                />
                {f.label || hostOf(f.url)}
              </a>
              {editing && (
                <button
                  onClick={() => setItems((prev) => prev.filter((x) => x.id !== f.id))}
                  className="ml-0.5 rounded-full px-1.5 text-slate-400 hover:text-rose-600"
                  aria-label="削除"
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="名前（省略可）"
          className="input sm:w-32"
        />
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="example.com"
          className="input sm:flex-1"
        />
        <button
          type="submit"
          className="rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
        >
          追加
        </button>
      </form>
    </section>
  );
}
