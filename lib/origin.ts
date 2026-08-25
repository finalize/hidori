import { headers } from "next/headers";

/**
 * このリクエストが来たオリジン。共有 URL を組み立てるのに使う。
 *
 * 設定に書かず毎回ヘッダから取るので、独自ドメインを足しても直す場所がない。
 * クライアント側で location から取る手もあるが、それだと描画後に state を
 * 書き換えることになり、無駄な再描画が1回挟まる。
 */
export async function origin(): Promise<string> {
  const head = await headers();
  const host = head.get("host") ?? "localhost:3000";
  // Workers 上は常に https。手元だけ http
  const proto = head.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
