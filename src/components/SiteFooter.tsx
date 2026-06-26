export function SiteFooter() {
  return (
    <footer className="border-t border-slate-800">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-8 sm:px-6">
        <p className="font-mono text-sm font-semibold uppercase tracking-[0.2em] text-white">
          Atlas Lite
        </p>
        <p className="max-w-xl text-sm leading-relaxed text-slate-500">
          ダーク基調のタスク管理。Googleカレンダー連携、Claudeによる必要知識の提案・サブタスク分解、
          進捗ダッシュボード、PWA、締切通知に対応。
        </p>
      </div>
    </footer>
  );
}
