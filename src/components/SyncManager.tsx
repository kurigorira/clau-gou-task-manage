"use client";

/**
 * 端末間同期の自動実行（画面には何も表示しない）。
 * - Google接続が有効になった時点で1回同期（リモートが新しければ反映してリロード）。
 * - 接続中はローカル変更を定期チェックし、変更があれば自動アップロード。
 */

import { useEffect, useRef } from "react";
import { useGoogle } from "@/lib/google";
import { syncWithDrive, localUpdatedAt, lastSyncedAt } from "@/lib/driveSync";

export function SyncManager() {
  const { isConnected, accessToken } = useGoogle();
  const busy = useRef(false);

  useEffect(() => {
    if (!isConnected || !accessToken) return;
    let cancelled = false;

    const run = async () => {
      if (busy.current) return;
      busy.current = true;
      try {
        const result = await syncWithDrive(accessToken);
        if (!cancelled && result.action === "downloaded") {
          // 他端末の新しいデータを取り込んだので、画面全体を最新状態にする。
          window.location.reload();
        }
      } catch {
        // 失敗しても静かに次の機会を待つ（設定ページから手動同期も可能）。
      } finally {
        busy.current = false;
      }
    };

    void run(); // 接続直後に1回

    // 接続中は、ローカルに未同期の変更があればアップロードする。
    const timer = setInterval(() => {
      if (localUpdatedAt() > lastSyncedAt()) void run();
    }, 10_000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [isConnected, accessToken]);

  return null;
}
