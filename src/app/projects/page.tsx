"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useGoogle } from "@/lib/google";
import {
  STATUS_META,
  agoLabel,
  daysAgo,
  loadProjectsFromDrive,
  ProjectsAuthError,
  type Project,
  type ProjectsData,
  type PjRepo,
} from "@/lib/projects";
import {
  GH_OWNER,
  ROADMAP_TEMPLATE,
  fetchRepoProgress,
  getGithubToken,
  readCachedProgress,
  setGithubToken,
  type RepoProgress,
} from "@/lib/github";

export default function ProjectsPage() {
  const { isConnected, accessToken, connect, clientId, status } = useGoogle();
  const [data, setData] = useState<ProjectsData | null>(null);
  const [modified, setModified] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>("すべて");

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const r = await loadProjectsFromDrive(accessToken);
      if (!r) {
        setError("ドライブに atlas-projects.json が見つかりません（翌朝の定期更新で作られます）");
        setData(null);
      } else {
        setData(r.data);
        setModified(r.modifiedTime);
      }
    } catch (e) {
      setError(
        e instanceof ProjectsAuthError
          ? "ログインの有効期限が切れました。右上の「同期する」で再ログインしてください"
          : "ドライブから読み込めませんでした",
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (isConnected) void load();
  }, [isConnected, load]);

  const categories = useMemo(() => {
    const s = new Set<string>();
    data?.projects.forEach((p) => s.add(p.category));
    return ["すべて", ...s];
  }, [data]);

  const projects = useMemo(() => {
    const list = (data?.projects ?? []).filter((p) => filter === "すべて" || p.category === filter);
    return [...list].sort(
      (a, b) =>
        STATUS_META[a.status].order - STATUS_META[b.status].order ||
        (a.priority === "高" ? -1 : 0) - (b.priority === "高" ? -1 : 0),
    );
  }, [data, filter]);

  const counts = useMemo(() => {
    const c = { green: 0, yellow: 0, red: 0, none: 0, done: 0 };
    data?.projects.forEach((p) => c[p.status]++);
    return c;
  }, [data]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">PJ進捗</h1>
          <p className="mt-1 text-sm text-slate-500">
            プロジェクト台帳とコード（GitHub）の進み具合。毎朝 Claude が更新します。
          </p>
        </div>
        {data && (
          <div className="text-right text-xs text-slate-500">
            <p>データ作成：{fmtDateTime(data.generatedAt)}</p>
            {modified && <p>ドライブ更新：{fmtDateTime(modified)}</p>}
            <button
              onClick={() => void load()}
              className="mt-1 rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              {loading ? "読み込み中…" : "再読み込み"}
            </button>
          </div>
        )}
      </div>

      {!isConnected && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
          <p>
            PJ進捗のデータは Google ドライブ（非公開）にあります。ログインすると表示されます。
          </p>
          {clientId && (
            <button
              onClick={connect}
              disabled={status === "connecting"}
              className="mt-4 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {status === "connecting" ? "ログイン中…" : "ログインして表示"}
            </button>
          )}
        </div>
      )}

      {error && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
          {error}
        </p>
      )}

      {data && (
        <>
          {/* サマリー */}
          <section className="grid gap-4 sm:grid-cols-[1fr_2fr]">
            <div className="grid grid-cols-4 gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              {(["red", "yellow", "green", "none"] as const).map((s) => (
                <div key={s} className="rounded-xl bg-slate-50 p-2 text-center">
                  <span className={`mx-auto block h-2.5 w-2.5 rounded-full ${STATUS_META[s].dot}`} />
                  <p className="mt-1 text-2xl font-bold text-slate-900">{counts[s]}</p>
                  <p className="text-[11px] text-slate-500">{STATUS_META[s].label}</p>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              {data.headline && <p className="text-sm font-semibold text-slate-900">{data.headline}</p>}
              {data.todayActions && data.todayActions.length > 0 && (
                <>
                  <p className="mt-2 text-xs font-medium text-slate-500">今日やること</p>
                  <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-slate-700">
                    {data.todayActions.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ol>
                </>
              )}
            </div>
          </section>

          {/* フィルター */}
          <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setFilter(c)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${
                  filter === c
                    ? "bg-brand-600 text-white"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* PJ一覧 */}
          <section className="space-y-3">
            {projects.map((p) => (
              <ProjectCard key={p.id} p={p} />
            ))}
          </section>

          {/* 台帳にないリポジトリ */}
          {data.unassignedRepos && data.unassignedRepos.length > 0 && (
            <section>
              <h2 className="mb-1 text-lg font-semibold text-slate-900">台帳にないが動いているコード</h2>
              <p className="mb-3 text-sm text-slate-500">
                直近に更新されたが、どのPJにも紐付いていないリポジトリです。PJに追加するか、対象外にするかを決めてください。
              </p>
              <div className="space-y-2">
                {data.unassignedRepos.map((r) => (
                  <RepoPanel
                    key={r.name}
                    repo={{ name: r.name, mapping: "guess", private: r.private, pushedAt: r.pushedAt }}
                    note={r.note}
                  />
                ))}
              </div>
            </section>
          )}

          <GithubSettings />
        </>
      )}
    </div>
  );
}

function ProjectCard({ p }: { p: Project }) {
  const [open, setOpen] = useState(p.status === "red" && p.priority === "高");
  const meta = STATUS_META[p.status];
  const stepsDone = p.steps?.filter((s) => s.done).length ?? 0;
  const stepsTotal = p.steps?.length ?? 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-start gap-3 p-4 text-left">
        <span className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${meta.dot}`} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-slate-400">{p.id}</span>
            <span className="font-semibold text-slate-900">{p.name}</span>
            {p.priority === "高" && (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                優先度 高
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <span className={`rounded-full px-2 py-0.5 ring-1 ${meta.chip}`}>{meta.label}</span>
            <span>{p.category}</span>
            <span>
              最終：{p.lastActivity ? `${p.lastActivity.slice(5).replace("-", "/")}（${agoLabel(p.lastActivity)}）` : "記録なし"}
              {p.lastActivitySource ? ` ・${p.lastActivitySource}` : ""}
            </span>
            {p.nextDate && <span>次回：{p.nextDate.slice(5).replace("-", "/")}</span>}
            {(p.repos?.length ?? 0) > 0 && <span>コード {p.repos!.length}件</span>}
          </div>
          {stepsTotal > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <Bar done={stepsDone} total={stepsTotal} />
              <span className="text-xs text-slate-500">
                {stepsDone}/{stepsTotal}
              </span>
            </div>
          )}
          {p.next && <p className="mt-2 text-sm text-slate-700">▶ {p.next}</p>}
        </div>
        <span className="text-slate-400">{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-slate-100 px-4 pb-4 pt-3 text-sm">
          {p.summary && <Field label="状況">{p.summary}</Field>}
          {p.blocker && <Field label="詰まり">{p.blocker}</Field>}
          {p.issues && p.issues.length > 0 && (
            <Field label="課題ID">
              <span className="flex flex-wrap gap-1">
                {p.issues.map((i) => (
                  <span key={i} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600">
                    {i}
                  </span>
                ))}
              </span>
            </Field>
          )}
          {p.steps && p.steps.length > 0 && (
            <Field label="ステップ">
              <ul className="space-y-0.5">
                {p.steps.map((s) => (
                  <li key={s.label} className={s.done ? "text-slate-400 line-through" : "text-slate-700"}>
                    {s.done ? "☑" : "☐"} {s.label}
                  </li>
                ))}
              </ul>
            </Field>
          )}
          {p.repos && p.repos.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-500">コードの進み具合</p>
              {p.repos.map((r) => (
                <RepoPanel key={r.name} repo={r} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RepoPanel({ repo, note }: { repo: PjRepo; note?: string }) {
  const [prog, setProg] = useState<RepoProgress | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setProg(readCachedProgress(repo.name));
  }, [repo.name]);

  const run = useCallback(
    async (force: boolean) => {
      if (repo.private && !getGithubToken()) {
        setErr("非公開リポジトリです。下の「GitHub の設定」でトークンを入れると詳細が見られます");
        return;
      }
      setBusy(true);
      setErr(null);
      try {
        setProg(await fetchRepoProgress(repo.name, force));
      } catch (e) {
        setErr(e instanceof Error ? e.message : "取得できませんでした");
      } finally {
        setBusy(false);
      }
    },
    [repo.name, repo.private],
  );

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !prog) void run(false);
  };

  const pushed = prog?.pushedAt ?? repo.pushedAt;
  const total = prog?.roadmap.reduce((a, s) => a + s.total, 0) ?? 0;
  const done = prog?.roadmap.reduce((a, s) => a + s.done, 0) ?? 0;

  return (
    <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200">
      <button onClick={toggle} className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-left">
        <span className="font-mono text-sm font-medium text-slate-800">{repo.name}</span>
        {repo.private && <span className="text-[11px] text-slate-400">🔒非公開</span>}
        {repo.mapping === "guess" && !note && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-700">紐付け要確認</span>
        )}
        <span className="text-xs text-slate-500">更新 {agoLabel(pushed)}</span>
        {prog && <Spark values={prog.weeklyCommits} />}
        {prog?.mode === "roadmap" && (
          <span className="text-xs font-semibold text-brand-700">
            {total ? Math.round((done / total) * 100) : 0}%
          </span>
        )}
        <span className="ml-auto text-slate-400">{open ? "▴" : "▾"}</span>
      </button>
      {note && <p className="px-3 pb-2 text-xs text-slate-500">{note}</p>}

      {open && (
        <div className="space-y-2 border-t border-slate-200 px-3 py-3">
          {busy && <p className="text-xs text-slate-500">GitHub から取得中…</p>}
          {err && <p className="text-xs text-amber-700">{err}</p>}
          {prog && (
            <>
              {prog.lastCommitMessage && (
                <p className="text-xs text-slate-500">最新コミット：{prog.lastCommitMessage}</p>
              )}
              {prog.mode === "roadmap" ? (
                <div className="space-y-1.5">
                  {prog.roadmap.map((s) => (
                    <details key={s.title} className="group">
                      <summary className="flex cursor-pointer list-none items-center gap-2">
                        <span className="w-32 shrink-0 truncate text-sm text-slate-700 sm:w-48">{s.title}</span>
                        <Bar done={s.done} total={s.total} />
                        <span className="w-12 shrink-0 text-right text-xs text-slate-500">
                          {s.done}/{s.total}
                        </span>
                      </summary>
                      <ul className="ml-2 mt-1 space-y-0.5 text-xs">
                        {s.items.map((i, idx) => (
                          <li key={idx} className={i.done ? "text-slate-400 line-through" : "text-slate-700"}>
                            {i.done ? "☑" : "☐"} {i.text}
                          </li>
                        ))}
                      </ul>
                    </details>
                  ))}
                </div>
              ) : (
                <div>
                  <p className="mb-1 text-xs text-slate-500">
                    ROADMAP.md がないため、フォルダごとの最終更新を表示しています。
                  </p>
                  <div className="space-y-1">
                    {prog.folders.length === 0 && <p className="text-xs text-slate-400">フォルダなし</p>}
                    {prog.folders.map((f) => (
                      <div key={f.path} className="flex items-center gap-2 text-xs">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${freshDot(f.lastCommit)}`} />
                        <span className="w-32 shrink-0 truncate font-mono text-slate-700">{f.path}/</span>
                        <span className="w-14 shrink-0 text-slate-500">{agoLabel(f.lastCommit)}</span>
                        <span className="truncate text-slate-400">{f.message}</span>
                      </div>
                    ))}
                  </div>
                  <details className="mt-2 text-xs text-slate-500">
                    <summary className="cursor-pointer">ROADMAP.md の書き方</summary>
                    <p className="mt-1">
                      リポジトリ直下に置くと、見出しごとに進捗率が出ます。
                    </p>
                    <pre className="mt-1 overflow-x-auto rounded bg-white p-2 font-mono text-[11px] text-slate-600 ring-1 ring-slate-200">
                      {ROADMAP_TEMPLATE}
                    </pre>
                  </details>
                </div>
              )}
              <div className="flex items-center gap-3 pt-1 text-xs">
                <a
                  href={`https://github.com/${GH_OWNER}/${repo.name}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-600 hover:underline"
                >
                  GitHub を開く
                </a>
                <button onClick={() => void run(true)} className="text-slate-500 hover:underline">
                  最新にする
                </button>
                <span className="text-slate-400">取得 {fmtDateTime(new Date(prog.fetchedAt).toISOString())}</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function GithubSettings() {
  const [token, setToken] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => setToken(getGithubToken()), []);
  return (
    <details className="rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
      <summary className="cursor-pointer font-medium text-slate-700">GitHub の設定（任意）</summary>
      <p className="mt-2 text-slate-500">
        非公開リポジトリの詳細を見る場合や、取得回数の上限（1時間60回）に当たる場合に、
        読み取り専用の個人アクセストークン（Fine-grained、Contents と Metadata の Read-only）を入れてください。
        トークンはこのブラウザ内だけに保存されます。
      </p>
      <div className="mt-3 flex gap-2">
        <input
          type="password"
          value={token}
          onChange={(e) => {
            setToken(e.target.value);
            setSaved(false);
          }}
          placeholder="github_pat_..."
          className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-1.5 font-mono text-xs"
        />
        <button
          onClick={() => {
            setGithubToken(token);
            setSaved(true);
          }}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
        >
          保存
        </button>
      </div>
      {saved && <p className="mt-1 text-xs text-emerald-600">保存しました</p>}
    </details>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="w-16 shrink-0 text-xs font-medium text-slate-500">{label}</span>
      <div className="min-w-0 flex-1 text-slate-700">{children}</div>
    </div>
  );
}

function Bar({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="h-2 min-w-[60px] flex-1 overflow-hidden rounded-full bg-slate-200">
      <div
        className={`h-full rounded-full ${pct === 100 ? "bg-emerald-500" : "bg-brand-500"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** 週ごとのコミット数の小さな棒グラフ（古い→新しい）。 */
function Spark({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  return (
    <span className="inline-flex h-4 items-end gap-[2px]" title={`直近8週のコミット数：${values.join(", ")}`}>
      {values.map((v, i) => (
        <span
          key={i}
          className={`w-1.5 rounded-sm ${v ? "bg-brand-500" : "bg-slate-200"}`}
          style={{ height: `${Math.max(12, (v / max) * 100)}%` }}
        />
      ))}
    </span>
  );
}

function freshDot(iso: string | null): string {
  const n = daysAgo(iso);
  if (n === null) return "bg-slate-300";
  if (n <= 3) return "bg-emerald-500";
  if (n <= 13) return "bg-amber-400";
  return "bg-rose-500";
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}
