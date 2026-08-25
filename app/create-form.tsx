"use client";

import { useActionState, useState } from "react";
import { createEvent } from "./actions";
import { LIMITS, type ActionState } from "../lib/schema";
import styles from "./form.module.css";

/**
 * 候補日はカレンダー UI ではなく1行1件のテキストで受け取る。
 * チャットから貼り付けてそのまま作れるほうが速い、という判断。
 */
export function CreateForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(createEvent, null);
  // 入力は制御する。未制御のままだと、送信後に React がフォームを初期化するので、
  // 検証で弾かれて戻ってきたときに書いた内容が消える
  const [title, setTitle] = useState("");
  const [candidates, setCandidates] = useState("");
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

      <label className={styles.label} htmlFor="candidates">
        候補日（1行に1つ）
      </label>
      <textarea
        id="candidates"
        name="candidates"
        required
        rows={6}
        value={candidates}
        onChange={(event) => setCandidates(event.target.value)}
        placeholder={"12/20(金) 19:00\n12/21(土) 18:00\n12/22(日) 18:00"}
        className={styles.textarea}
      />
      <p className={styles.hint}>
        書いたとおりに表示されます。{LIMITS.candidates} 件までです。
      </p>

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

      <button type="submit" disabled={pending} className={styles.primary}>
        {pending ? "作成中…" : "出欠表をつくる"}
      </button>
    </form>
  );
}
