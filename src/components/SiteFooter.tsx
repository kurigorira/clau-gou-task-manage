export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-6 text-sm text-slate-500 sm:px-6">
        <p className="font-medium text-slate-700">Taskful</p>
        <p>
          ホームページ型のタスク管理サイト。Googleカレンダー連携（クライアントサイドOAuth）と、
          Claudeによる必要知識の自動提案・サブタスク分解に対応しています。
        </p>
      </div>
    </footer>
  );
}
