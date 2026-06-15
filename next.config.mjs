/** @type {import('next').NextConfig} */

// GitHub Pages のプロジェクトサイトはサブパス配下に公開されるため basePath を設定する。
// 例: https://kurigorira.github.io/clau-gou-task-manage/
const isProd = process.env.NODE_ENV === "production";
const repoBasePath = "/clau-gou-task-manage";

const nextConfig = {
  output: "export", // 静的書き出し（GitHub Pages 対応）
  basePath: isProd ? repoBasePath : "",
  assetPrefix: isProd ? repoBasePath : "",
  images: {
    unoptimized: true, // 静的書き出しでは画像最適化を無効化
  },
  trailingSlash: true,
};

export default nextConfig;
