"use client";

import { useEffect, useState } from "react";

const KEY = "clau-gou-theme";

/** ライト/ダークを切り替えるボタン。<html> の dark クラスで制御し localStorage に保存。 */
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    const el = document.documentElement;
    el.classList.toggle("dark", next);
    try {
      window.localStorage.setItem(KEY, next ? "dark" : "light");
    } catch {
      /* noop */
    }
  };

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "ライトモードに切替" : "ダークモードに切替"}
      title={dark ? "ライトモード" : "ダークモード"}
      className="ml-1 flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}
