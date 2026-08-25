"use client";

import { useState } from "react";
import { ja } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { LIMITS } from "@/lib/schema";
import {
  formatCandidateLabel,
  fromDateKey,
  toDateKey,
  todayInTokyo,
} from "@/lib/dates";
import styles from "./candidate-picker.module.css";

export type CandidateDraft = { date: string; time: string };

/** 調整さんに倣って 19:00 を初期値にする。飲み会がいちばん多い用途なので */
const DEFAULT_TIME = "19:00";

/**
 * カレンダーで日を選び、選んだ日ごとに時刻を決める。
 *
 * 送信は hidden の JSON 1本にまとめる。フォームの name を日付ごとに増やすより、
 * サーバ側の検証（zod）が1か所で済む。
 */
export function CandidatePicker({
  name,
  value,
  onChange,
  alreadyUsed = 0,
}: {
  /** hidden input の name */
  name: string;
  value: CandidateDraft[];
  onChange: (next: CandidateDraft[]) => void;
  /** 既にあるイベントに足すとき、その件数。上限の判定に使う */
  alreadyUsed?: number;
}) {
  const [month, setMonth] = useState<Date>(new Date());
  const today = todayInTokyo();
  const remaining = LIMITS.candidates - alreadyUsed - value.length;

  const selected = value.map((item) => fromDateKey(item.date));

  function handleSelect(dates: Date[] | undefined) {
    const keys = (dates ?? []).map(toDateKey);
    const kept = value.filter((item) => keys.includes(item.date));
    const added = keys
      .filter((key) => !value.some((item) => item.date === key))
      // 直前に決めた時刻を引き継ぐ。1日ずつ入れ直さなくて済む
      .map((key) => ({ date: key, time: value.at(-1)?.time ?? DEFAULT_TIME }));
    const next = [...kept, ...added].sort(
      (a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time),
    );
    onChange(next.slice(0, LIMITS.candidates - alreadyUsed));
  }

  function setTime(date: string, time: string) {
    onChange(value.map((item) => (item.date === date ? { ...item, time } : item)));
  }

  function remove(date: string) {
    onChange(value.filter((item) => item.date !== date));
  }

  return (
    <div className={styles.picker}>
      <input type="hidden" name={name} value={JSON.stringify(value)} />

      <Calendar
        mode="multiple"
        selected={selected}
        onSelect={handleSelect}
        month={month}
        onMonthChange={setMonth}
        // 月名と曜日を日本語にする。v1 は日本時間・日本語に固定している
        locale={ja}
        // 過ぎた日は選ばせない
        disabled={{ before: fromDateKey(today) }}
        className={styles.calendar}
      />

      {value.length === 0 ? (
        <p className={styles.empty}>カレンダーから候補の日を選んでください。</p>
      ) : (
        <ul className={styles.list}>
          {value.map((item) => (
            <li key={item.date} className={styles.row}>
              <span className={styles.day}>{formatCandidateLabel(item.date)}</span>
              <label className={styles.timeLabel}>
                <span className="visually-hidden">
                  {formatCandidateLabel(item.date)} の時刻
                </span>
                <input
                  type="time"
                  value={item.time}
                  onChange={(event) => setTime(item.date, event.target.value)}
                  className={styles.time}
                />
              </label>
              <button
                type="button"
                onClick={() => remove(item.date)}
                className={styles.remove}
                aria-label={`${formatCandidateLabel(item.date)} を候補から外す`}
              >
                外す
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className={styles.hint}>
        {value.length} 件を選んでいます。あと {Math.max(0, remaining)} 件まで選べます。
        時刻は日ごとに変えられます。
      </p>
    </div>
  );
}
