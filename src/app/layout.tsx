import type { Metadata } from "next";
import "./globals.css";
import { TaskProvider } from "@/lib/store";
import { GoogleProvider } from "@/lib/google";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Taskful — タスク管理",
  description:
    "Googleカレンダー連携を見据えた、ホームページ型のタスク管理サイト。各タスクに必要な知識・技術も管理できます。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        <GoogleProvider>
          <TaskProvider>
            <SiteHeader />
            <main className="mx-auto min-h-[calc(100vh-8rem)] w-full max-w-6xl px-4 py-8 sm:px-6">
              {children}
            </main>
            <SiteFooter />
          </TaskProvider>
        </GoogleProvider>
      </body>
    </html>
  );
}
