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
 * Google Identity Services（クライアントサイドOAuth）を使った認証コンテキスト。
 * サーバーを持たずに、ブラウザから直接 Google Calendar API を呼ぶための
 * アクセストークンを取得・保持する。
 *
 * - Client ID はユーザーが Google Cloud で発行し、設定画面で入力する（localStorage 保存）。
 * - アクセストークンはメモリ上のみで保持し、永続化しない（リロードで再接続）。
 */

const GIS_SRC = "https://accounts.google.com/gsi/client";
const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const CLIENT_ID_KEY = "clau-gou-google-client-id";

// GIS の最小型定義（@types を増やさず必要分だけ宣言）。
interface TokenResponse {
  access_token?: string;
  error?: string;
  expires_in?: number;
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
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
}

const GoogleContext = createContext<GoogleContextValue | null>(null);

export function GoogleProvider({ children }: { children: React.ReactNode }) {
  const [clientId, setClientIdState] = useState("");
  const [scriptReady, setScriptReady] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Client ID を localStorage から復元。
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(CLIENT_ID_KEY);
      if (saved) setClientIdState(saved);
    } catch {
      /* noop */
    }
  }, []);

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
      setError("先に Client ID を設定してください");
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
        scope: CALENDAR_SCOPE,
        callback: (resp) => {
          if (resp.error || !resp.access_token) {
            setError(resp.error ?? "アクセストークンを取得できませんでした");
            setStatus("error");
            return;
          }
          setAccessToken(resp.access_token);
          setStatus("connected");
        },
      });
      tokenClient.requestAccessToken();
    } catch (e) {
      setError(e instanceof Error ? e.message : "接続に失敗しました");
      setStatus("error");
    }
  }, [clientId]);

  const disconnect = useCallback(() => {
    if (accessToken && window.google?.accounts?.oauth2) {
      window.google.accounts.oauth2.revoke(accessToken);
    }
    setAccessToken(null);
    setStatus("idle");
  }, [accessToken]);

  const value = useMemo<GoogleContextValue>(
    () => ({
      clientId,
      setClientId,
      scriptReady,
      status,
      error,
      accessToken,
      isConnected: status === "connected" && !!accessToken,
      connect,
      disconnect,
    }),
    [clientId, setClientId, scriptReady, status, error, accessToken, connect, disconnect],
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
