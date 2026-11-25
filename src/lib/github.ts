/**
 * GitHub リポジトリの「セクションごとの進み具合」をブラウザから直接取得する。
 *
 * 1. リポジトリ直下の ROADMAP.md があれば、`## 見出し` ごとにチェックボックス
 *    （- [x] / - [ ]）を数えて進捗率を出す（本命）。
 * 2. ROADMAP.md がなければ、トップレベルのフォルダごとに最終更新日を出す（代用）。
 * 3. どちらの場合も、直近8週間の週ごとのコミット数を出す。
 *
 * 認証なしの GitHub API は 1時間60回までなので、結果は localStorage に6時間キャッシュする。
 * 非公開リポジトリは、設定した個人アクセストークン（読み取り専用）がある場合だけ読める。
 */

export const GH_OWNER = "kurigorira";
const TOKEN_KEY = "atlas-github-token";
const CACHE_PREFIX = "atlas-gh-v1:";
const CACHE_TTL = 6 * 60 * 60 * 1000;

export interface RoadmapItem {
  text: string;
  done: boolean;
}
export interface RoadmapSection {
  title: string;
  done: number;
  total: number;
  items: RoadmapItem[];
}
export interface FolderSection {
  path: string;
  lastCommit: string | null;
  message: string;
}
export interface RepoProgress {
  repo: string;
  fetchedAt: number;
  defaultBranch: string;
  pushedAt: string | null;
  description: string | null;
  mode: "roadmap" | "folders";
  roadmap: RoadmapSection[];
  folders: FolderSection[];
  /** 古い順に8週分 */
  weeklyCommits: number[];
  lastCommitMessage: string | null;
}

export function getGithubToken(): string {
  try {
    return window.localStorage.getItem(TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}
export function setGithubToken(v: string): void {
  try {
    if (v) window.localStorage.setItem(TOKEN_KEY, v.trim());
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* noop */
  }
}

export class GithubError extends Error {
  constructor(
    message: string,
    public kind: "rate" | "notfound" | "other",
  ) {
    super(message);
  }
}

async function gh<T>(path: string, accept = "application/vnd.github+json"): Promise<T> {
  const token = getGithubToken();
  const res = await fetch(`https://api.github.com${path}`, {
    headers: { Accept: accept, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (res.status === 403 || res.status === 429) {
    throw new GithubError("GitHub の取得回数の上限に達しました（1時間後に回復）", "rate");
  }
  if (res.status === 404) throw new GithubError("見つかりません（非公開の可能性）", "notfound");
  if (!res.ok) throw new GithubError(`GitHub ${res.status}`, "other");
  return (accept.includes("raw") ? await res.text() : await res.json()) as T;
}

/** ROADMAP.md を見出し（## / ###）ごとのチェックリストに分解する。 */
export function parseRoadmap(md: string): RoadmapSection[] {
  const sections: RoadmapSection[] = [];
  let cur: RoadmapSection | null = null;
  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trimEnd();
    const h = /^(#{2,3})\s+(.+)$/.exec(line);
    if (h) {
      cur = { title: h[2].trim(), done: 0, total: 0, items: [] };
      sections.push(cur);
      continue;
    }
    const c = /^\s*[-*]\s+\[([ xX])\]\s+(.+)$/.exec(line);
    if (c) {
      if (!cur) {
        cur = { title: "全体", done: 0, total: 0, items: [] };
        sections.push(cur);
      }
      const done = c[1].toLowerCase() === "x";
      cur.items.push({ text: c[2].trim(), done });
      cur.total++;
      if (done) cur.done++;
    }
  }
  return sections.filter((s) => s.total > 0);
}

async function fetchRoadmap(repo: string, branch: string): Promise<string | null> {
  const token = getGithubToken();
  try {
    if (token) {
      return await gh<string>(`/repos/${GH_OWNER}/${repo}/contents/ROADMAP.md`, "application/vnd.github.raw");
    }
    // 公開リポジトリは raw から読む（API の回数を使わない）。
    const res = await fetch(`https://raw.githubusercontent.com/${GH_OWNER}/${repo}/${branch}/ROADMAP.md`);
    return res.ok ? await res.text() : null;
  } catch (e) {
    if (e instanceof GithubError && e.kind === "notfound") return null;
    throw e;
  }
}

function weekBuckets(dates: string[]): number[] {
  const buckets = new Array(8).fill(0) as number[];
  const now = Date.now();
  for (const d of dates) {
    const age = Math.floor((now - new Date(d).getTime()) / (7 * 86_400_000));
    if (age >= 0 && age < 8) buckets[7 - age]++;
  }
  return buckets;
}

const SKIP_DIRS = new Set(["node_modules", "vendor", "dist", "out", "build", ".next"]);

export function readCachedProgress(repo: string): RepoProgress | null {
  try {
    const raw = window.localStorage.getItem(CACHE_PREFIX + repo);
    return raw ? (JSON.parse(raw) as RepoProgress) : null;
  } catch {
    return null;
  }
}

export async function fetchRepoProgress(repo: string, force = false): Promise<RepoProgress> {
  const cached = readCachedProgress(repo);
  if (!force && cached && Date.now() - cached.fetchedAt < CACHE_TTL) return cached;

  const info = await gh<{ default_branch: string; pushed_at: string; description: string | null }>(
    `/repos/${GH_OWNER}/${repo}`,
  );
  const branch = info.default_branch;
  const since = new Date(Date.now() - 56 * 86_400_000).toISOString();
  const commits = await gh<{ commit: { author: { date: string }; message: string } }[]>(
    `/repos/${GH_OWNER}/${repo}/commits?since=${since}&per_page=100`,
  );
  const weeklyCommits = weekBuckets(commits.map((c) => c.commit.author.date));
  const lastCommitMessage = commits[0]?.commit.message.split("\n")[0] ?? null;

  const md = await fetchRoadmap(repo, branch);
  const roadmap = md ? parseRoadmap(md) : [];

  let folders: FolderSection[] = [];
  if (roadmap.length === 0) {
    const tree = await gh<{ tree: { path: string; type: string }[] }>(
      `/repos/${GH_OWNER}/${repo}/git/trees/${branch}`,
    );
    const dirs = tree.tree
      .filter((t) => t.type === "tree" && !t.path.startsWith(".") && !SKIP_DIRS.has(t.path))
      .map((t) => t.path)
      .slice(0, 8);
    folders = await Promise.all(
      dirs.map(async (path) => {
        try {
          const c = await gh<{ commit: { author: { date: string }; message: string } }[]>(
            `/repos/${GH_OWNER}/${repo}/commits?path=${encodeURIComponent(path)}&per_page=1`,
          );
          return {
            path,
            lastCommit: c[0]?.commit.author.date ?? null,
            message: c[0]?.commit.message.split("\n")[0] ?? "",
          };
        } catch {
          return { path, lastCommit: null, message: "" };
        }
      }),
    );
    folders.sort((a, b) => (b.lastCommit ?? "").localeCompare(a.lastCommit ?? ""));
  }

  const result: RepoProgress = {
    repo,
    fetchedAt: Date.now(),
    defaultBranch: branch,
    pushedAt: info.pushed_at,
    description: info.description,
    mode: roadmap.length > 0 ? "roadmap" : "folders",
    roadmap,
    folders,
    weeklyCommits,
    lastCommitMessage,
  };
  try {
    window.localStorage.setItem(CACHE_PREFIX + repo, JSON.stringify(result));
  } catch {
    /* noop */
  }
  return result;
}

export const ROADMAP_TEMPLATE = `# ROADMAP

## 入力画面
- [x] フォームを作る
- [ ] 入力チェック

## 集計
- [ ] 月次の集計
- [ ] CSV出力

## 運用
- [ ] 手順書
- [ ] 本番に導入
`;
