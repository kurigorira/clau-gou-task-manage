# Taskful — タスク管理サイト

Googleカレンダー連携を見据えた、**ホームページ型のタスク管理サイト**です。
各タスクに「必要な知識・技術」を紐付けて管理できるのが特徴です。

公開URL（GitHub Pages 設定後）:
`https://kurigorira.github.io/clau-gou-task-manage/`

## 主な機能

- 🏠 **ホームページ型UI** — トップに進捗サマリーと直近の締切を表示
- ✅ **タスク管理** — 追加 / 編集 / 削除、状態（未着手・進行中・完了）・優先度・締切
- 🗂 **リスト / カンバン** 表示の切り替え
- 🧠 **必要な知識・技術** — 各タスクにスキル・前提知識・参考資料リンクを登録
- 📅 **Googleカレンダー連携** — 締切を終日イベントとして登録／予定をカレンダーに表示
- 📚 **ナレッジ** — 登録した知識・技術を横断的に閲覧

> タスクデータはブラウザの localStorage に保存されます。

### Googleカレンダー連携について

サーバーを持たず、**Google Identity Services（クライアントサイドOAuth）** を使って
ブラウザから直接 Google Calendar API を呼び出します。GitHub Pages のまま動作します。

利用には Google Cloud で発行した OAuth Client ID（ウェブアプリケーション）が必要です。
アプリ内の **設定（/settings）** ページに手順があります。

## ロードマップ

| フェーズ | 内容 | 状態 |
|---|---|---|
| Phase 1 | ホームページ型UI + タスク管理 + 知識・技術表示 | ✅ 実装済み |
| Phase 2 | Googleカレンダー連携（締切登録・予定表示） | ✅ 実装済み |
| Phase 3 | AIによる必要知識の自動提案・サブタスク分解 | 予定 |
| Phase 4 | 締切リマインダー / 進捗グラフ / PWA など | 予定 |

※ AIによる自動提案など、API キーを秘匿する必要がある機能は、その段階で
サーバーレス関数（Vercel 等）の導入を検討します。

## 開発

```bash
npm install      # 依存関係のインストール
npm run dev      # 開発サーバー（http://localhost:3000）
npm run build    # 静的書き出し（out/ に生成）
```

## デプロイ（GitHub Pages）

`.github/workflows/deploy.yml` により、`main` / 開発ブランチへの push で
自動ビルド & GitHub Pages へデプロイされます。

初回のみ、リポジトリの **Settings → Pages → Build and deployment → Source** を
**「GitHub Actions」** に設定してください。

## 技術スタック

- Next.js 14 (App Router, 静的エクスポート)
- React 18 / TypeScript
- Tailwind CSS
