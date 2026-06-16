"use client";

import { useEffect } from "react";

// 本番（GitHub Pages）ではサブパス配下に公開されるため basePath を付ける。
const BASE = process.env.NODE_ENV === "production" ? "/clau-gou-task-manage" : "";

/** manifest のリンク挿入とサービスワーカー登録を行う（PWA対応）。 */
export function PwaRegister() {
  useEffect(() => {
    if (!document.querySelector('link[rel="manifest"]')) {
      const link = document.createElement("link");
      link.rel = "manifest";
      link.href = `${BASE}/manifest.webmanifest`;
      document.head.appendChild(link);
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register(`${BASE}/sw.js`, { scope: `${BASE}/` })
        .catch(() => {
          // 登録失敗（dev など）は無視。
        });
    }
  }, []);

  return null;
}
