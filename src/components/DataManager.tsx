"use client";

import { useRef, useState } from "react";
import { useTasks } from "@/lib/store";
import { downloadBackup, parseBackup } from "@/lib/backup";

export function DataManager() {
  const { tasks, replaceAll } = useTasks();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(
    null,
  );

  const handleExport = () => {
    downloadBackup(tasks);
    setMessage({ kind: "ok", text: "バックアップをダウンロードしました。" });
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // 同じファイルを再選択できるようにリセット。
    if (!file) return;
    try {
      const text = await file.text();
      const imported = parseBackup(text);
      const ok = window.confirm(
        `${imported.length} 件のタスクを読み込みます。現在の ${tasks.length} 件は置き換えられます。よろしいですか？`,
      );
      if (!ok) return;
      replaceAll(imported);
      setMessage({ kind: "ok", text: `${imported.length} 件のタスクを読み込みました。` });
    } catch (err) {
      setMessage({
        kind: "error",
        text: err instanceof Error ? err.message : "読み込みに失敗しました。",
      });
    }
  };

  const handleClear = () => {
    if (
      window.confirm(
        "すべてのタスクを削除します。事前にエクスポートでバックアップを取ることをおすすめします。本当に削除しますか？",
      )
    ) {
      replaceAll([]);
      setMessage({ kind: "ok", text: "すべてのタスクを削除しました。" });
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="font-semibold text-slate-900">データの管理</h2>
      <p className="mt-1 text-sm text-slate-500">
        タスクはこの端末のブラウザに保存されます。エクスポートでバックアップし、別の端末で
        インポートすると移行できます。
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={handleExport}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          エクスポート（{tasks.length}件）
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          インポート
        </button>
        <button
          onClick={handleClear}
          className="rounded-lg px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
        >
          全タスクを削除
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={handleFile}
          className="hidden"
        />
      </div>

      {message && (
        <p
          className={`mt-3 text-sm ${
            message.kind === "ok" ? "text-emerald-600" : "text-rose-600"
          }`}
        >
          {message.text}
        </p>
      )}
    </section>
  );
}
