"use client";

/**
 * Google ドライブの最近のファイルを表示するウィジェット。
 * 既存のGoogle連携トークン（drive.readonly スコープ）でブラウザから直接 Drive API を呼ぶ。
 */

import Link from "next/link";
import { useEffect, useState } from "react";
import { useGoogle } from "@/lib/google";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  modifiedTime?: string;
}

function fileEmoji(mime: string): string {
  if (mime === "application/vnd.google-apps.folder") return "📁";
  if (mime === "application/vnd.google-apps.document") return "📝";
  if (mime === "application/vnd.google-apps.spreadsheet") return "📊";
  if (mime === "application/vnd.google-apps.presentation") return "📽️";
  if (mime === "application/pdf") return "📕";
  if (mime.startsWith("image/")) return "🖼️";
  if (mime.startsWith("video/")) return "🎬";
  return "📄";
}

function fmtDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function DriveWidget() {
  const { isConnected, accessToken } = useGoogle();
  const [files, setFiles] = useState<DriveFile[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected || !accessToken) {
      setFiles(null);
      return;
    }
    let cancelled = false;
    setError(null);
    const params = new URLSearchParams({
      pageSize: "6",
      orderBy: "modifiedTime desc",
      fields: "files(id,name,mimeType,webViewLink,modifiedTime)",
      q: "trashed = false",
    });
    fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((data) => {
        if (!cancelled) setFiles((data.files ?? []) as DriveFile[]);
      })
      .catch((e) => {
        if (cancelled) return;
        const code = e instanceof Error ? e.message : "";
        if (code === "403") {
          setError(
            "ドライブにアクセスできません。Google Cloud で「Google Drive API」を有効化し、設定ページで一度切断してから再接続してください。",
          );
        } else if (code === "401") {
          setError("接続の有効期限が切れました。設定ページから再接続してください。");
        } else {
          setError("ファイル一覧を取得できませんでした。");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isConnected, accessToken]);

  return (
    <section className="card p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-900">📁 Google ドライブ</h2>
        <a
          href="https://drive.google.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          開く →
        </a>
      </div>

      {!isConnected ? (
        <p className="mt-3 text-sm text-slate-400">
          <Link href="/settings" className="font-medium text-brand-600 hover:underline">
            設定でGoogle連携
          </Link>
          すると、最近のファイルがここに表示されます。
        </p>
      ) : error ? (
        <p className="mt-3 text-sm text-amber-700">{error}</p>
      ) : !files ? (
        <p className="mt-3 text-sm text-slate-400">読み込み中...</p>
      ) : files.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">ファイルがありません。</p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-100">
          {files.map((f) => (
            <li key={f.id}>
              <a
                href={f.webViewLink ?? "https://drive.google.com/"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 py-2 hover:bg-brand-50/50"
              >
                <span className="text-lg">{fileEmoji(f.mimeType)}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">
                  {f.name}
                </span>
                <span className="shrink-0 text-xs text-slate-400">
                  {fmtDate(f.modifiedTime)}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
