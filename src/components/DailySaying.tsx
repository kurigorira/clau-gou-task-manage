"use client";

import { useEffect, useState } from "react";
import { SAYINGS, sayingIndexFor, type SayingKind } from "@/lib/sayings";

const KIND_STYLE: Record<SayingKind, string> = {
  格言: "bg-brand-50 text-brand-700",
  故事成語: "bg-amber-50 text-amber-700",
  ことわざ: "bg-emerald-50 text-emerald-700",
};

export function DailySaying() {
  // 日付はブラウザ側で決める（静的書き出し時の日付で固定しないため）。
  const [index, setIndex] = useState<number | null>(null);
  useEffect(() => setIndex(sayingIndexFor(new Date())), []);

  const next = () =>
    setIndex((i) => {
      if (SAYINGS.length < 2) return i;
      let n = i ?? 0;
      while (n === i) n = Math.floor(Math.random() * SAYINGS.length);
      return n;
    });

  const s = index === null ? null : SAYINGS[index];

  return (
    <section className="card px-5 py-6 text-center sm:px-8 sm:py-8">
      {s ? (
        <>
          <span
            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${KIND_STYLE[s.kind]}`}
          >
            {s.kind}
          </span>
          <p className="mt-3 text-xl font-bold leading-relaxed text-slate-900 sm:text-2xl">
            {s.text}
          </p>
          <p className="mt-2 text-sm text-slate-500">{s.meaning}</p>
          <div className="mt-3 flex items-center justify-center gap-3 text-xs text-slate-400">
            {s.source && <span>— {s.source}</span>}
            <button
              onClick={next}
              className="rounded-full px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              title="別のことば"
            >
              ↻ 別のことば
            </button>
          </div>
        </>
      ) : (
        <p className="py-6">&nbsp;</p>
      )}
    </section>
  );
}
