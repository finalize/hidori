"use client";

import { useActionState, useState } from "react";
import { addCandidates, deleteEvent } from "../../../actions";
import { LIMITS, type ActionState } from "../../../../lib/schema";
import { CandidatePicker, type CandidateDraft } from "@/components/candidate-picker";
import styles from "./manage.module.css";

export function ManagePanel({
  eventId,
  handover,
  candidateCount,
  participantCount,
}: {
  eventId: string;
  /** 主催者を別端末へ引き継ぐリンク。サーバ側で組み立てて渡す */
  handover: string;
  candidateCount: number;
  participantCount: number;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(addCandidates, null);
  const [confirming, setConfirming] = useState(false);
  const [additions, setAdditions] = useState<CandidateDraft[]>([]);

  return (
    <>
      <section className={styles.block}>
        <h2 className={styles.h2}>候補日を足す</h2>
        <form action={action} className={styles.form}>
          <input type="hidden" name="eventId" value={eventId} />
          <CandidatePicker
            name="candidates"
            value={additions}
            onChange={setAdditions}
            alreadyUsed={candidateCount}
          />
          <p className={styles.hint}>
            いま {candidateCount} 件です。合わせて {LIMITS.candidates} 件までです。
          </p>
          {state && "error" in state && (
            <p role="alert" className={styles.error}>
              {state.error}
            </p>
          )}
          {state && "ok" in state && (
            <p role="status" className={styles.ok}>
              追加しました。
            </p>
          )}
          <button
            type="submit"
            disabled={pending || additions.length === 0}
            className={styles.primary}
          >
            {pending ? "追加中…" : "候補を足す"}
          </button>
        </form>
      </section>

      <section className={styles.block}>
        <h2 className={styles.h2}>別の端末で主催者として操作する</h2>
        <p className={styles.hint}>
          このリンクを開いた端末が主催者になります。<strong>人に配らないでください。</strong>
        </p>
        <input
          readOnly
          value={handover}
          aria-label="主催者の引き継ぎリンク"
          onFocus={(event) => event.currentTarget.select()}
          className={styles.handover}
        />
      </section>

      <section className={styles.block}>
        <h2 className={styles.h2}>イベントを削除する</h2>
        <p className={styles.hint}>
          候補日と {participantCount} 人ぶんの回答がすべて消えます。元には戻せません。
        </p>
        {confirming ? (
          <form action={async () => void (await deleteEvent(eventId))} className={styles.confirmRow}>
            <button type="submit" className={styles.danger}>
              本当に削除する
            </button>
            <button type="button" onClick={() => setConfirming(false)} className={styles.cancel}>
              やめる
            </button>
          </form>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className={styles.danger}>
            イベントを削除する
          </button>
        )}
      </section>
    </>
  );
}
