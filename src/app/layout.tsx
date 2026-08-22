import type { Metadata, Viewport } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { TaskProvider } from "@/lib/store";
import { GoogleProvider } from "@/lib/google";
import { AnthropicProvider } from "@/lib/anthropic";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PwaRegister } from "@/components/PwaRegister";
import { ReminderManager } from "@/components/ReminderManager";

const space = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Atlas Lite — タスク管理",
  description:
    "Googleカレンダー連携とAIアシストを備えた、明るく見やすいタスク管理サイト。各タスクに必要な知識・技術も管理できます。",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" className={`${space.variable} ${mono.variable}`}>
      <body>
        <GoogleProvider>
          <AnthropicProvider>
            <TaskProvider>
              <PwaRegister />
              <ReminderManager />
              <SiteHeader />
              <main className="mx-auto min-h-[calc(100vh-8rem)] w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
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
