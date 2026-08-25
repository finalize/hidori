"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./event.module.css";

/**
 * 共有 URL の表示とコピー。
 * URL はサーバ側（lib/origin.ts）で組み立てて渡す。描画後に location から取ると、
 * state の書き換えで再描画が1回余計に走る。
 */
export function ShareBox({
  url,
  eventId,
  justCreated,
  isAdmin,
}: {
  url: string;
  eventId: string;
  justCreated: boolean;
  isAdmin: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // クリップボードが使えない環境では、入力欄から手で選んでもらう
    }
  }

  return (
    <section className={styles.share} aria-labelledby="share-heading">
      <h2 id="share-heading" className={styles.h2}>
        {justCreated ? "作成しました。この URL を配ってください" : "この URL を配ってください"}
      </h2>
      <div className={styles.shareRow}>
        <input
          readOnly
          value={url}
          aria-label="共有する URL"
          onFocus={(event) => event.currentTarget.select()}
          className={styles.shareInput}
        />
        <button type="button" onClick={copy} className={styles.copy}>
          {copied ? "コピーしました" : "コピー"}
        </button>
      </div>
      {justCreated && isAdmin && (
        <p className={styles.adminNote}>
          この端末が主催者として記録されました。候補の追加とイベントの削除は
          <Link href={`/e/${eventId}/manage`}>主催者のページ</Link>
          からできます。別の端末で操作したくなったら、そのページでリンクを発行してください。
        </p>
      )}
    </section>
  );
}
