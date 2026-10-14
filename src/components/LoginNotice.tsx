"use client";

import { useGoogle } from "@/lib/google";

/** ログインに失敗したとき、どのページにいても見えるようヘッダーの下に理由を出す。 */
export function LoginNotice() {
  const { error, status, connect, resetAndLogin, clearError } = useGoogle();
  if (!error || status !== "error") return null;

  return (
    <div className="border-b border-rose-200 bg-rose-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:px-6">
        <p className="flex-1 text-sm text-rose-800">⚠ {error}</p>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            onClick={connect}
            className="rounded-full bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
          >
            もう一度ログイン
          </button>
          <button
            onClick={resetAndLogin}
            className="rounded-full border border-rose-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
          >
            ログインをやり直す
          </button>
          <button
            onClick={clearError}
            className="rounded-full px-2 py-1.5 text-xs text-rose-400 hover:text-rose-700"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
