"use client";

import { useActionState, useState } from "react";
import { createEvent } from "./actions";
import { LIMITS, type ActionState } from "../lib/schema";
import { CandidatePicker, type CandidateDraft } from "@/components/candidate-picker";
import styles from "./form.module.css";

/**
 * 候補日はカレンダーから選ぶ（shadcn の Calendar）。
 * 選んだ日ごとに時刻を決められる。
 */
export function CreateForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(createEvent, null);
  // 入力は制御する。未制御のままだと、送信後に React がフォームを初期化するので、
  // 検証で弾かれて戻ってきたときに書いた内容が消える
  const [title, setTitle] = useState("");
  const [candidates, setCandidates] = useState<CandidateDraft[]>([]);
  const [note, setNote] = useState("");

  return (
    <form action={action} className={styles.form}>
      <label className={styles.label} htmlFor="title">
        イベント名
      </label>
      <input
        id="title"
        name="title"
        required
        maxLength={LIMITS.title}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="例: 忘年会"
        className={styles.input}
      />

      <span className={styles.label}>候補日</span>
      <CandidatePicker name="candidates" value={candidates} onChange={setCandidates} />

      <label className={styles.label} htmlFor="note">
        ひとこと（任意）
      </label>
      <textarea
        id="note"
        name="note"
        rows={2}
        maxLength={LIMITS.note}
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="例: 場所は決まったら共有します"
        className={styles.textarea}
      />

      {state && "error" in state && (
        <p role="alert" className={styles.error}>
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || candidates.length === 0}
        className={styles.primary}
      >
        {pending ? "作成中…" : "出欠表をつくる"}
      </button>
    </form>
  );
}
