/**
 * OpenNext が生成する Worker は fetch ハンドラしか持たない。
 * 保存期間を過ぎたイベントを消す cron を動かすため、生成された fetch を包み直して
 * scheduled を並べて export する。Worker は1個のままで済む。
 * https://opennext.js.org/cloudflare/howtos/custom-worker
 */
// `.open-next/worker.js` はビルド時に生成される。ビルド前は解決できず、ビルド後は型が無い。
// どちらの状態でも成立させたいので ts-expect-error ではなく ts-ignore を使う
// （ts-expect-error だとビルド後に「未使用の抑止」で落ちる）
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { default as handler } from "./.open-next/worker.js";
import { RETENTION_DAYS } from "./lib/retention";

/**
 * 最終更新から RETENTION_DAYS を過ぎたイベントと、その子レコードを消す。
 *
 * D1 は外部キー制約が既定で無効なので、ON DELETE CASCADE に頼らず子から順に消す。
 * 消した件数を返すのは、ログで「動いているが対象が無い」と「動いていない」を区別するため。
 */
export async function purgeExpired(db: D1Database, retentionDays = RETENTION_DAYS) {
  const cutoff = `-${retentionDays} days`;
  const expired = await db
    .prepare("SELECT id FROM events WHERE updated_at < datetime('now', ?)")
    .bind(cutoff)
    .all<{ id: string }>();

  const ids = expired.results.map((row) => row.id);
  if (ids.length === 0) return { events: 0 };

  // D1 は1文の bind パラメータに上限（100）がある。
  // まとめて消そうとすると、対象が増えたときにちょうど失敗する ＝
  // 掃除がいちばん必要な場面で動かなくなるので、分割して流す。
  const CHUNK = 50;
  for (let start = 0; start < ids.length; start += CHUNK) {
    const chunk = ids.slice(start, start + CHUNK);
    // D1 のプレースホルダは配列を展開しないので、件数ぶん並べる
    const marks = chunk.map(() => "?").join(",");
    await db.batch([
      db
        .prepare(
          `DELETE FROM answers WHERE participant_id IN
             (SELECT id FROM participants WHERE event_id IN (${marks}))`,
        )
        .bind(...chunk),
      db.prepare(`DELETE FROM participants WHERE event_id IN (${marks})`).bind(...chunk),
      db.prepare(`DELETE FROM candidates WHERE event_id IN (${marks})`).bind(...chunk),
      db.prepare(`DELETE FROM events WHERE id IN (${marks})`).bind(...chunk),
    ]);
  }

  return { events: ids.length };
}

export default {
  fetch: handler.fetch,

  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(
      purgeExpired(env.DB).then(({ events }) => {
        console.log(`purge: ${events} 件のイベントを削除しました`);
      }),
    );
  },
} satisfies ExportedHandler<CloudflareEnv>;
