"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // 背面のページがスクロールしないようにする。
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  // 外側がスクロール領域、内側は「画面より低ければ中央・高ければ上から」並べる。
  // 外側自体を items-center にすると、画面より長い内容の上端が切れて戻れなくなる。
  // body 直下に描画し、置かれた場所の余白（space-y など）でずれないようにする。
  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40">
      <div className="relative flex min-h-full items-start justify-center p-3 sm:items-center sm:p-6">
        <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
        <div className="relative z-10 w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="閉じる"
            >
              ✕
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
