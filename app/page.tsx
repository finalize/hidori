import Link from "next/link";
import { CreateForm } from "./create-form";
import { RETENTION_DAYS } from "../lib/retention";
import styles from "./home.module.css";

// D1 を読むわけではないが、Cookie を読むレイアウトの下にあるので静的化しない
export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: PageProps<"/">) {
  const { deleted } = await searchParams;

  return (
    <main className="wrap">
      <header className={styles.header}>
        <h1 className={styles.title}>hidori</h1>
        <p className={styles.lead}>
          URL を配るだけで日取りが決まります。登録は要りません。
        </p>
      </header>

      {deleted && (
        <p role="status" className={styles.notice}>
          イベントを削除しました。
        </p>
      )}

      <CreateForm />

      <section className={styles.about}>
        <h2 className={styles.h2}>調整さんと違うところ</h2>
        <ul className={styles.list}>
          <li>
            <strong>自分の回答は自分だけが直せます。</strong>
            回答すると、その端末にだけ編集用の合言葉が保存されます。URL を知っているだけの人が
            他人の行を書き換えることはできません。
          </li>
          <li>
            <strong>スマホで読める表になります。</strong>
            画面が狭いときは表をやめ、候補ごとに集計を出します。
          </li>
          <li>
            <strong>{RETENTION_DAYS} 日で自動的に消えます。</strong>
            最後に誰かが触ってから数えます。<Link href="/privacy">預かるもの</Link> に何を保存しているか書いています。
          </li>
        </ul>
      </section>
    </main>
  );
}
