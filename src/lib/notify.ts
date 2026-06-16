"use client";

const ENABLED_KEY = "clau-gou-notify-enabled";
const LAST_KEY = "clau-gou-notify-last";

export function isNotifyEnabled(): boolean {
  try {
    return window.localStorage.getItem(ENABLED_KEY) === "1";
  } catch {
    return false;
  }
}

export function setNotifyEnabled(enabled: boolean): void {
  try {
    if (enabled) window.localStorage.setItem(ENABLED_KEY, "1");
    else window.localStorage.removeItem(ENABLED_KEY);
  } catch {
    /* noop */
  }
}

/** 締切通知の許可をリクエストし、許可されたら有効化する。結果(boolean)を返す。 */
export async function requestNotifyPermission(): Promise<boolean> {
  if (typeof Notification === "undefined") return false;
  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  const granted = permission === "granted";
  setNotifyEnabled(granted);
  return granted;
}

/** 今日まだ通知していなければ true（通知後に記録する）。 */
export function shouldNotifyToday(): boolean {
  const today = new Date().toISOString().slice(0, 10);
  try {
    if (window.localStorage.getItem(LAST_KEY) === today) return false;
    window.localStorage.setItem(LAST_KEY, today);
    return true;
  } catch {
    return true;
  }
}
