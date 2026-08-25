/**
 * URL に出る ID と、権限の根拠になるトークンを作る。
 *
 * どちらも「知っていること」だけが権限なので、必ず CSPRNG（crypto.getRandomValues）を使う。
 * workspace の synch に似た発想の genRoomCode() があるが、あちらは Math.random() の6桁で、
 * 肩越しに読ませる前提の合言葉。用途が違うので、秘密として使うものに流用しない。
 */

/** 読み違えやすい 0 O I l 1 を除いた 57 字種。URL を口頭で伝えたり手で打つときに効く */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

/**
 * 22文字で約 128 ビット。
 * 剰余で偏らないよう、字種の個数で割り切れない値は捨てて引き直す。
 */
function randomString(length: number): string {
  const limit = 256 - (256 % ALPHABET.length);
  let out = "";
  while (out.length < length) {
    const bytes = crypto.getRandomValues(new Uint8Array(length - out.length));
    for (const byte of bytes) {
      if (byte >= limit) continue;
      out += ALPHABET[byte % ALPHABET.length];
    }
  }
  return out;
}

/** イベントの ID。URL に出るので推測されにくいことが要る */
export function newEventId(): string {
  return randomString(22);
}

/** 主催者トークン・回答者の編集トークン */
export function newToken(): string {
  return randomString(32);
}

/**
 * トークンの比較。長さが同じなら値によらず一定時間で終わるようにする。
 * D1 相手にタイミングを測るのは現実的でないが、比較を1か所に集めておく意味のほうが大きい。
 */
export function tokenEquals(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
