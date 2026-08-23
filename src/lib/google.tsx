"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/**
 * Google Identity Services（クライアントサイドOAuth）を使ったログインコンテキスト。
 * サーバーを持たずに、ブラウザから直接 Google API を呼ぶためのアクセストークンを管理する。
 *
 * - Client ID はユーザーが Google Cloud で発行し、設定画面で入力する（localStorage 保存）。
 * - ログイン方式: トークンと有効期限・アカウント情報を localStorage に保存し、
 *   リロードや再訪問時に自動復元する（個人端末での利用が前提）。
 *   トークンの有効期限（約1時間）が切れたら自動的にログアウト状態へ戻る。
 */

const GIS_SRC = "https://accounts.google.com/gsi/client";
// ログイン情報 + カレンダー編集 + ドライブ閲覧 + アプリ専用領域（端末間同期）。
const SCOPES =
  "openid email profile " +
  "https://www.googleapis.com/auth/calendar.events " +
  "https://www.googleapis.com/auth/drive.readonly " +
  "https://www.googleapis.com/auth/drive.appdata";
const CLIENT_ID_KEY = "clau-gou-google-client-id";
const SESSION_KEY = "atlas-google-session-v1";

interface StoredSession {
  accessToken: string;
  /** 失効時刻（ms）。 */
  expiresAt: number;
  email: string;
  picture: string;
}

// GIS の最小型定義（@types を増やさず必要分だけ宣言）。
interface TokenResponse {
  access_token?: string;
  error?: string;
  expires_in?: number;
}
interface TokenError {
  type?: string;
  message?: string;
}
interface TokenClient {
  requestAccessToken: (overrides?: { prompt?: string }) => void;
}
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (resp: TokenResponse) => void;
            error_callback?: (err: TokenError) => void;
          }) => TokenClient;
          revoke: (token: string, done?: () => void) => void;
        };
      };
    };
  }
}

type Status = "idle" | "connecting" | "connected" | "error";

interface GoogleContextValue {
  clientId: string;
  setClientId: (id: string) => void;
  scriptReady: boolean;
  status: Status;
  error: string | null;
  accessToken: string | null;
  /** ログイン中のアカウント（メール・アイコン）。 */
  email: string;
  picture: string;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
}

const GoogleContext = createContext<GoogleContextValue | null>(null);

function loadSession(): StoredSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as StoredSession;
    // 残り1分を切っていたら期限切れ扱いにする。
    if (!s.accessToken || s.expiresAt < Date.now() + 60_000) return null;
    return s;
  } catch {
    return null;
  }
}

function saveSession(s: StoredSession | null): void {
  try {
    if (s) window.localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* noop */
  }
}

export function GoogleProvider({ children }: { children: React.ReactNode }) {
  const [clientId, setClientIdState] = useState("");
  const [scriptReady, setScriptReady] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [picture, setPicture] = useState("");
  const [expiresAt, setExpiresAt] = useState(0);

  // Client ID と保存済みログインセッションを復元。
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(CLIENT_ID_KEY);
      if (saved) setClientIdState(saved);
    } catch {
      /* noop */
    }
    const session = loadSession();
    if (session) {
      setAccessToken(session.accessToken);
      setEmail(session.email);
      setPicture(session.picture);
      setExpiresAt(session.expiresAt);
      setStatus("connected");
    }
  }, []);

  // 有効期限が来たら自動でログアウト状態へ戻す。
  useEffect(() => {
    if (status !== "connected" || expiresAt === 0) return;
    const ms = expiresAt - Date.now();
    if (ms <= 0) {
      setAccessToken(null);
      setStatus("idle");
      saveSession(null);
      return;
    }
    const timer = setTimeout(() => {
      setAccessToken(null);
      setStatus("idle");
      saveSession(null);
    }, ms);
    return () => clearTimeout(timer);
  }, [status, expiresAt]);

  // GIS スクリプトを読み込む。
  useEffect(() => {
    if (window.google?.accounts?.oauth2) {
      setScriptReady(true);
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GIS_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => setScriptReady(true));
      return;
    }
    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptReady(true);
    script.onerror = () => setError("Google認証スクリプトの読み込みに失敗しました");
    document.head.appendChild(script);
  }, []);

  const setClientId = useCallback((id: string) => {
    const trimmed = id.trim();
    setClientIdState(trimmed);
    try {
      if (trimmed) window.localStorage.setItem(CLIENT_ID_KEY, trimmed);
      else window.localStorage.removeItem(CLIENT_ID_KEY);
    } catch {
      /* noop */
    }
  }, []);

  const connect = useCallback(() => {
    setError(null);
    if (!clientId) {
      setError("先に設定ページで Client ID を入力してください");
      setStatus("error");
      return;
    }
    if (!window.google?.accounts?.oauth2) {
      setError("Google認証スクリプトがまだ読み込まれていません");
      setStatus("error");
      return;
    }
    setStatus("connecting");
    try {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: (resp) => {
          if (resp.error || !resp.access_token) {
            setError(resp.error ?? "アクセストークンを取得できませんでした");
            setStatus("error");
            return;
          }
          const token = resp.access_token;
          // 期限は1分の余裕を持たせて保存する。
          const exp = Date.now() + Math.max((resp.expires_in ?? 3600) - 60, 300) * 1000;
          setAccessToken(token);
          setExpiresAt(exp);
          setStatus("connected");
          // アカウント情報（メール・アイコン）を取得して保存。
          void fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then((r) => (r.ok ? r.json() : null))
            .then((info: { email?: string; picture?: string } | null) => {
              const em = info?.email ?? "";
              const pic = info?.picture ?? "";
              setEmail(em);
              setPicture(pic);
              saveSession({ accessToken: token, expiresAt: exp, email: em, picture: pic });
            })
            .catch(() => {
              saveSession({ accessToken: token, expiresAt: exp, email: "", picture: "" });
            });
        },
        // ポップアップが開けない/閉じられた・生成元不一致などOAuth以外の失敗を拾う。
        error_callback: (err) => {
          if (err?.type === "popup_failed_to_open") {
            setError(
              "ログインポップアップを開けませんでした。ブラウザのポップアップブロックを解除して、もう一度お試しください。",
            );
            setStatus("error");
            return;
          }
          // popup_closed は、Googleの「アクセスをブロック（access_denied）」画面の後にも起きる。
          // 個人利用で最も多い原因＝OAuth同意画面のテストユーザー未登録を案内する。
          setError(
            "ログインが完了しませんでした。多くの場合、Google Cloud の「OAuth 同意画面」で、" +
              "お使いのGoogleアカウントが『テストユーザー』に登録されていないのが原因です（エラー: access_denied）。" +
              "対処: ①OAuth同意画面 → テストユーザーに自分のアドレスを追加する、" +
              "または ②アプリを「公開」して本番に切り替える。" +
              "あわせて「承認済みJavaScript生成元」に https://kurigorira.github.io が登録されているかもご確認ください。",
          );
          setStatus("error");
        },
      });
      tokenClient.requestAccessToken();
    } catch (e) {
      setError(e instanceof Error ? e.message : "ログインに失敗しました");
      setStatus("error");
    }
  }, [clientId]);

  const disconnect = useCallback(() => {
    if (accessToken && window.google?.accounts?.oauth2) {
      window.google.accounts.oauth2.revoke(accessToken);
    }
    setAccessToken(null);
    setEmail("");
    setPicture("");
    setExpiresAt(0);
    setStatus("idle");
    saveSession(null);
  }, [accessToken]);

  const value = useMemo<GoogleContextValue>(
    () => ({
      clientId,
      setClientId,
      scriptReady,
      status,
      error,
      accessToken,
      email,
      picture,
      isConnected: status === "connected" && !!accessToken,
      connect,
      disconnect,
    }),
    [
      clientId,
      setClientId,
      scriptReady,
      status,
      error,
      accessToken,
      email,
      picture,
      connect,
      disconnect,
    ],
  );

  return <GoogleContext.Provider value={value}>{children}</GoogleContext.Provider>;
}

export function useGoogle(): GoogleContextValue {
  const ctx = useContext(GoogleContext);
  if (!ctx) {
    throw new Error("useGoogle は GoogleProvider の内側で使ってください");
  }
  return ctx;
}
