import type { Metadata, Viewport } from "next";
import "./globals.css";
import { TaskProvider } from "@/lib/store";
import { GoogleProvider } from "@/lib/google";
import { AnthropicProvider } from "@/lib/anthropic";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PwaRegister } from "@/components/PwaRegister";
import { ReminderManager } from "@/components/ReminderManager";

export const metadata: Metadata = {
  title: "Taskful — タスク管理",
  description:
    "Googleカレンダー連携を見据えた、ホームページ型のタスク管理サイト。各タスクに必要な知識・技術も管理できます。",
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ハイドレーション前にテーマを適用し、画面のちらつき（FOUC）を防ぐ。
  const themeScript = `(function(){try{var t=localStorage.getItem('clau-gou-theme');if(t==='dark'||(!t&&window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark');}}catch(e){}})();`;

  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <GoogleProvider>
          <AnthropicProvider>
            <TaskProvider>
              <PwaRegister />
              <ReminderManager />
              <SiteHeader />
              <main className="mx-auto min-h-[calc(100vh-8rem)] w-full max-w-6xl px-4 py-8 sm:px-6">
                {children}
              </main>
              <SiteFooter />
            </TaskProvider>
          </AnthropicProvider>
        </GoogleProvider>
      </body>
    </html>
  );
}
