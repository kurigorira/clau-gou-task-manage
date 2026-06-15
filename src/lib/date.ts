/** YYYY-MM-DD を「6月20日(金)」のような日本語表記にする。 */
export function formatJaDate(iso: string | null): string {
  if (!iso) return "締切なし";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${d.getMonth() + 1}月${d.getDate()}日(${weekday})`;
}

/** 締切までの日数。過去なら負の値。null は null を返す。 */
export function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(due.getTime())) return null;
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}
