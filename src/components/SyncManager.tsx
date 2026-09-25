"use client";

/**
 * 端末間同期の自動実行（画面には何も表示しない）。
 * ログイン中は次のタイミングで同期する:
 * - ログインした直後
 * - この端末で変更したとき（数秒以内）
 * - 1分ごと（他の端末の変更を取り込むため）
 * - アプリの画面に戻ってきたとき
 */

import { useEffect, useRef } from "react";
import { useGoogle } from "@/lib/google";
import {
  syncWithDrive,
  localUpdatedAt,
  lastSyncedAt,
  DriveAuthError,
} from "@/lib/driveSync";

const PULL_INTERVAL_MS = 60_000;
const PUSH_CHECK_MS = 3_000;

export function SyncManager() {
  const { isConnected, accessToken, expire } = useGoogle();
  const busy = useRef(false);

  useEffect(() => {
    if (!isConnected || !accessToken) return;
    let cancelled = false;

    const run = async () => {
      if (busy.current || cancelled) return;
      busy.current = true;
      try {
        await syncWithDrive(accessToken);
      } catch (e) {
        // トークンが無効になっていたら、ログアウト表示に戻して再ログインを促す。
        if (e instanceof DriveAuthError && !cancelled) expire();
      } finally {
        busy.current = false;
      }
    };

    void run();

    const pushTimer = setInterval(() => {
      if (localUpdatedAt() > lastSyncedAt()) void run();
    }, PUSH_CHECK_MS);
    const pullTimer = setInterval(() => void run(), PULL_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") void run();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      cancelled = true;
      clearInterval(pushTimer);
      clearInterval(pullTimer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [isConnected, accessToken, expire]);

  return null;
}
