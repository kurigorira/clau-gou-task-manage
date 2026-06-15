"use client";

import { useState } from "react";
import { useGoogle } from "@/lib/google";

export default function SettingsPage() {
  const {
    clientId,
    setClientId,
    scriptReady,
    status,
    error,
    isConnected,
    connect,
    disconnect,
  } = useGoogle();
  const [draft, setDraft] = useState(clientId);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setClientId(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">設定</h1>
        <p className="mt-1 text-sm text-slate-500">
          Googleカレンダー連携の設定を行います。
        </p>
      </div>

      {/* 接続状態 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">Googleカレンダー連携</h2>
            <p className="mt-1 text-sm text-slate-500">
              {isConnected
                ? "接続済み。タスクの締切をカレンダーに登録できます。"
                : "未接続です。Client ID を設定して接続してください。"}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              isConnected ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                isConnected ? "bg-emerald-500" : "bg-slate-400"
              }`}
            />
            {isConnected ? "接続済み" : "未接続"}
          </span>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {isConnected ? (
            <button
              onClick={disconnect}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              切断する
            </button>
          ) : (
            <button
              onClick={connect}
              disabled={!clientId || !scriptReady || status === "connecting"}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {status === "connecting" ? "接続中..." : "Googleと接続する"}
            </button>
          )}
          {!scriptReady && (
            <span className="self-center text-xs text-slate-400">
              Google認証スクリプトを読み込み中...
            </span>
          )}
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}
      </section>

      {/* Client ID 設定 */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-900">OAuth Client ID</h2>
        <p className="mt-1 text-sm text-slate-500">
          Google Cloud で発行した「ウェブアプリケーション」用の Client ID を入力してください。
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="xxxxxxxx.apps.googleusercontent.com"
            className="input flex-1"
          />
          <button
            onClick={handleSave}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            保存
          </button>
        </div>
        {saved && <p className="mt-2 text-sm text-emerald-600">保存しました。</p>}
      </section>

      {/* セットアップ手順 */}
      <section className="rounded-2xl border border-brand-100 bg-brand-50/40 p-6">
        <h2 className="font-semibold text-brand-800">セットアップ手順</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
          <li>
            <a
              href="https://console.cloud.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-600 underline-offset-2 hover:underline"
            >
              Google Cloud Console
            </a>
            でプロジェクトを作成
          </li>
          <li>「APIとサービス」→「ライブラリ」から <strong>Google Calendar API</strong> を有効化</li>
          <li>「OAuth 同意画面」を設定（テストユーザーに自分のGmailを追加）</li>
          <li>
            「認証情報」→「OAuth クライアント ID」を作成。種類は
            <strong>「ウェブアプリケーション」</strong>
          </li>
          <li>
            <strong>承認済みの JavaScript 生成元</strong> に公開URLを追加:
            <code className="mx-1 rounded bg-white px-1.5 py-0.5 text-xs text-slate-800">
              https://kurigorira.github.io
            </code>
            （ローカル開発時は
            <code className="mx-1 rounded bg-white px-1.5 py-0.5 text-xs text-slate-800">
              http://localhost:3000
            </code>
            も追加）
          </li>
          <li>発行された Client ID を上のフォームに貼り付けて保存 → 「Googleと接続する」</li>
        </ol>
        <p className="mt-3 text-xs text-slate-500">
          ※ アクセストークンはブラウザのメモリ上のみで保持され、サーバーには送信されません。
          ページを再読み込みすると再接続が必要です。
        </p>
      </section>
    </div>
  );
}
