import Link from "next/link";
import type { Metadata } from "next";
import { RETENTION_DAYS } from "../../lib/retention";
import styles from "./privacy.module.css";

export const metadata: Metadata = {
  title: "預かるもの",
  description: `hidori が保存する情報と、${RETENTION_DAYS} 日で消える仕組みについて。`,
};

export default function Privacy() {
  return (
    <main className="wrap">
      <h1 className={styles.title}>預かるもの</h1>
      <p className={styles.lead}>
        hidori は登録の要らない道具です。そのぶん、何を預かっているかをはっきりさせておきます。
      </p>

      <h2 className={styles.h2}>保存するもの</h2>
      <ul className={styles.list}>
        <li>イベント名・ひとこと・候補日（作った人が入力したもの）</li>
        <li>回答者が入力した名前・ひとこと・各候補への ○△×</li>
        <li>作成日時と最終更新日時</li>
      </ul>

      <h2 className={styles.h2}>保存しないもの</h2>
      <ul className={styles.list}>
        <li>アカウント・メールアドレス・電話番号（そもそも入力欄がありません）</li>
        <li>アクセス解析や広告のための識別子（外部のスクリプトを読み込んでいません）</li>
        <li>
          IP アドレス。連打を防ぐ回数の判定にだけ一時的に使い、記録として残していません。
        </li>
      </ul>

      <h2 className={styles.h2}>いつ消えるか</h2>
      <p>
        イベントは<strong>最後に更新されてから {RETENTION_DAYS} 日</strong>で、
        回答も含めて自動的に削除されます。誰かが回答するたびに数え直すので、
        使われているあいだは消えません。日程調整は数週間で終わるものなので、
        他人の名前を無期限に持ち続けないことにしました。
      </p>

      <h2 className={styles.h2}>自分で消すには</h2>
      <ul className={styles.list}>
        <li>
          <strong>自分の回答だけ消す</strong>：回答したページの下にある「自分の回答を削除する」から。
          回答した端末でのみ操作できます。
        </li>
        <li>
          <strong>イベントごと消す</strong>：作成した人が主催者のページから削除できます。
        </li>
      </ul>

      <h2 className={styles.h2}>URL について</h2>
      <p>
        イベントの URL は推測しにくい文字列です。検索結果に出ないようにもしています。
        ただし<strong>URL を知っている人は誰でも中身を見られます。</strong>
        配る相手にはお気をつけください。
      </p>

      <p className={styles.back}>
        <Link href="/">hidori にもどる</Link>
      </p>
    </main>
  );
}
