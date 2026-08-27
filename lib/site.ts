/**
 * OGP の絶対 URL を組み立てるのに使う。
 *
 * 画面の共有 URL は lib/origin.ts がリクエストヘッダから取っているが、
 * メタデータはリクエストの外で決まるので、ここだけは固定値が要る。
 * 独自ドメインを付けたら SITE_URL を設定するか、この既定値を差し替える。
 */
export const SITE_URL = process.env.SITE_URL ?? "https://hidori.shgysd.workers.dev";
