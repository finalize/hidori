"use client";

import { useActionState, useState } from "react";
import { deleteMyAnswer, submitAnswer } from "../../actions";
import { LIMITS, MARKS, MARK_LABEL, type ActionState, type Mark } from "../../../lib/schema";
import styles from "./answer.module.css";

type Props = {
  eventId: string;
  candidates: { id: number; label: string }[];
  /** 自分の回答が既にあるとき。この端末のトークンで引き当てたもの */
  me?: { name: string; comment: string; marks: Record<string, Mark> };
};

/**
 * 回答は候補を縦に並べ、それぞれに大きな3つのボタンを置く。
 * 集計表のセルを押させると、スマホでは狙いが小さすぎて押し間違える。
 */
export function AnswerForm({ eventId, candidates, me }: Props) {
  const [state, action, pending] = useActionState<ActionState, FormData>(submitAnswer, null);
  const [removing, setRemoving] = useState(false);
  // 未制御のままだと、送信後に React がフォームを初期化する。
  // 検証で弾かれて戻ってきたときに、選んだ ○△× まで消えてしまう
  const [name, setName] = useState(me?.name ?? "");
  const [comment, setComment] = useState(me?.comment ?? "");
  const [marks, setMarks] = useState<Record<string, Mark>>(me?.marks ?? {});

  return (
    <section aria-labelledby="answer-heading" className={styles.section}>
      <h2 id="answer-heading" className={styles.h2}>
        {me ? "自分の回答を直す" : "回答する"}
      </h2>
      {me && (
        <p className={styles.mine}>
          この端末には <strong>{me.name}</strong> さんの回答が保存されています。ここで直すと上書きされます。
        </p>
      )}

      <form action={action} className={styles.form}>
        <input type="hidden" name="eventId" value={eventId} />

        <label className={styles.label} htmlFor="name">
          名前
        </label>
        <input
          id="name"
          name="name"
          required
          maxLength={LIMITS.name}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="表示される名前"
          className={styles.input}
        />

        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>それぞれの候補について</legend>
          <ul className={styles.candidates}>
            {candidates.map((candidate) => (
              <li key={candidate.id} className={styles.candidate}>
                <span className={styles.candidateLabel}>{candidate.label}</span>
                <div className={styles.marks} role="group" aria-label={candidate.label}>
                  {MARKS.map((mark) => (
                    <label key={mark} className={styles.mark}>
                      <input
                        type="radio"
                        name={`mark_${candidate.id}`}
                        value={mark}
                        // 初期値を ○ にしない。何も選ばずに送るだけで賛成が水増しされるため、
                        // 候補ごとに必ず1つ選ばせる
                        required
                        checked={marks[String(candidate.id)] === mark}
                        onChange={() =>
                          setMarks((current) => ({ ...current, [String(candidate.id)]: mark }))
                        }
                        className={styles.radio}
                      />
                      <span className={`${styles.markFace} ${styles[mark]}`}>
                        <span aria-hidden="true">{MARK_LABEL[mark].symbol}</span>
                        <span className="visually-hidden">{MARK_LABEL[mark].text}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </fieldset>

        <label className={styles.label} htmlFor="comment">
          ひとこと（任意）
        </label>
        <input
          id="comment"
          name="comment"
          maxLength={LIMITS.comment}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="例: 20時からなら行けます"
          className={styles.input}
        />

        {state && "error" in state && (
          <p role="alert" className={styles.error}>
            {state.error}
          </p>
        )}
        {state && "ok" in state && (
          <div role="status" className={styles.ok}>
            <p className={styles.okLine}>保存しました。</p>
            {state.editUrl && (
              <>
                <p className={styles.okLine}>
                  別の端末から自分の回答を直すには、このリンクを自分宛てに控えておいてください。
                  <strong>この画面を離れると二度と出ません。</strong>
                </p>
                <input
                  readOnly
                  value={state.editUrl}
                  aria-label="自分の回答を直すためのリンク"
                  onFocus={(event) => event.currentTarget.select()}
                  className={styles.editUrl}
                />
              </>
            )}
          </div>
        )}

        <button type="submit" disabled={pending} className={styles.primary}>
          {pending ? "保存中…" : me ? "この内容に直す" : "回答を送る"}
        </button>
      </form>

      {me && (
        <form
          className={styles.removeRow}
          action={async () => {
            setRemoving(true);
            await deleteMyAnswer(eventId);
            setRemoving(false);
          }}
        >
          <button type="submit" disabled={removing} className={styles.remove}>
            {removing ? "削除中…" : "自分の回答を削除する"}
          </button>
        </form>
      )}
    </section>
  );
}
