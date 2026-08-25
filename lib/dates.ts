/**
 * 候補日の表記。v1 は日本時間に固定している（画面にもそう書く）。
 *
 * カレンダーで選んだ日付は "2026-12-20" のような文字列でやり取りする。
 * Date を経由すると、選んだ日と保存された日が端末のタイムゾーン次第で1日ずれる。
 */

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

/** "2026-12-20" → 曜日つきの表示。時刻は任意 */
export function formatCandidateLabel(date: string, time?: string): string {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  // UTC で組み立てて UTC で読む。ローカル時刻を挟まないので曜日がずれない
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
  const head = `${month}/${day}(${weekday})`;
  return time ? `${head} ${time}` : head;
}

/**
 * 並べ替えと、将来 .ics を出すときのための値。
 * v1 は日本時間固定なので、オフセットを直接付ける。
 */
export function toStartsAt(date: string, time?: string): string {
  return `${date}T${time ?? "00:00"}:00+09:00`;
}

/** その日の 00:00（日本時間）より前かどうか。過去の日付は選ばせない */
export function todayInTokyo(): string {
  // en-CA は YYYY-MM-DD 形式になる
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });
}

/** Date（カレンダーが返すローカル日時）→ "YYYY-MM-DD" */
export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** "YYYY-MM-DD" → Date（そのローカル日の 0 時）。カレンダーに選択状態を戻すのに使う */
export function fromDateKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
}
