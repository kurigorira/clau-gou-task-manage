"use client";

/**
 * 天気ウィジェット。Open-Meteo（キー不要・CORS対応）から4日分の予報を取得する。
 */

import { useEffect, useState } from "react";

const CITIES = [
  { key: "sapporo", label: "札幌", lat: 43.06, lon: 141.35 },
  { key: "sendai", label: "仙台", lat: 38.27, lon: 140.87 },
  { key: "tokyo", label: "東京", lat: 35.68, lon: 139.77 },
  { key: "nagoya", label: "名古屋", lat: 35.18, lon: 136.91 },
  { key: "osaka", label: "大阪", lat: 34.69, lon: 135.5 },
  { key: "hiroshima", label: "広島", lat: 34.39, lon: 132.46 },
  { key: "fukuoka", label: "福岡", lat: 33.59, lon: 130.4 },
  { key: "naha", label: "那覇", lat: 26.21, lon: 127.68 },
];

const CITY_KEY = "atlas-weather-city";

/** WMO天気コード → 絵文字とラベル。 */
function weatherInfo(code: number): { emoji: string; label: string } {
  if (code === 0) return { emoji: "☀️", label: "快晴" };
  if (code <= 2) return { emoji: "🌤", label: "晴れ" };
  if (code === 3) return { emoji: "☁️", label: "曇り" };
  if (code === 45 || code === 48) return { emoji: "🌫", label: "霧" };
  if (code <= 57) return { emoji: "🌦", label: "霧雨" };
  if (code <= 67) return { emoji: "🌧", label: "雨" };
  if (code <= 77) return { emoji: "🌨", label: "雪" };
  if (code <= 82) return { emoji: "🌦", label: "にわか雨" };
  if (code <= 86) return { emoji: "🌨", label: "雪" };
  return { emoji: "⛈", label: "雷雨" };
}

interface Daily {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
}

const DOW = ["日", "月", "火", "水", "木", "金", "土"];

export function WeatherWidget() {
  const [cityKey, setCityKey] = useState("tokyo");
  const [daily, setDaily] = useState<Daily | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(CITY_KEY);
      if (saved && CITIES.some((c) => c.key === saved)) setCityKey(saved);
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    const city = CITIES.find((c) => c.key === cityKey) ?? CITIES[2];
    let cancelled = false;
    setError(null);
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Asia%2FTokyo&forecast_days=4`;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!cancelled) setDaily(data.daily as Daily);
      })
      .catch(() => {
        if (!cancelled) setError("天気を取得できませんでした");
      });
    return () => {
      cancelled = true;
    };
  }, [cityKey]);

  const changeCity = (key: string) => {
    setCityKey(key);
    try {
      window.localStorage.setItem(CITY_KEY, key);
    } catch {
      /* noop */
    }
  };

  const today = daily ? weatherInfo(daily.weather_code[0]) : null;

  return (
    <section className="card p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-slate-900">🌤 天気</h2>
        <select
          value={cityKey}
          onChange={(e) => changeCity(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700"
        >
          {CITIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-slate-400">{error}</p>
      ) : !daily || !today ? (
        <p className="mt-4 text-sm text-slate-400">読み込み中...</p>
      ) : (
        <div className="mt-4 flex items-center gap-4">
          {/* 今日 */}
          <div className="flex shrink-0 items-center gap-3 rounded-2xl bg-sky-50 px-4 py-3">
            <span className="text-4xl">{today.emoji}</span>
            <div>
              <p className="text-sm font-semibold text-slate-700">今日・{today.label}</p>
              <p className="text-sm">
                <span className="font-bold text-rose-500">
                  {Math.round(daily.temperature_2m_max[0])}°
                </span>
                <span className="mx-1 text-slate-300">/</span>
                <span className="font-bold text-blue-500">
                  {Math.round(daily.temperature_2m_min[0])}°
                </span>
              </p>
            </div>
          </div>
          {/* 明日以降 */}
          <div className="grid flex-1 grid-cols-3 gap-1 text-center">
            {[1, 2, 3].map((i) => {
              const info = weatherInfo(daily.weather_code[i]);
              const d = new Date(`${daily.time[i]}T00:00:00`);
              return (
                <div key={i} className="rounded-xl px-1 py-2">
                  <p className="text-xs text-slate-400">{DOW[d.getDay()]}</p>
                  <p className="mt-0.5 text-xl">{info.emoji}</p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    <span className="text-rose-500">{Math.round(daily.temperature_2m_max[i])}</span>
                    /
                    <span className="text-blue-500">{Math.round(daily.temperature_2m_min[i])}</span>
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
