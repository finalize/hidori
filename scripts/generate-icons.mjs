/**
 * ファビコンを SVG から生成する。
 *   node scripts/generate-icons.mjs
 *
 * 図柄は「○」。このアプリで押してもらう記号そのもので、16px でも形が残る。
 * 色を変えるときは MARK の値を直して再実行する（app/globals.css の --accent と揃える）。
 *
 * 出力は app/ 直下に置く。Next.js の App Router は icon.* / apple-icon.* / favicon.ico を
 * ファイル名で拾って <link rel="icon"> を出してくれるので、public/ には置かない。
 */
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const root = path.dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const appDir = path.join(root, "app");

/** app/globals.css の --accent（ライト）と --accent-fg に合わせる */
const MARK = { bg: "#0a6357", fg: "#ffffff" };

/**
 * 角丸の四角に白い輪。
 * 輪は塗りではなく線で描く。塗りの円だと 16px で「ただの点」になり、
 * ×（塗りつぶし）と見分けが付かなくなる。
 */
const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <rect width="64" height="64" rx="14" fill="${MARK.bg}"/>
  <circle cx="32" cy="32" r="17" fill="none" stroke="${MARK.fg}" stroke-width="7"/>
</svg>`;

/**
 * ICO は PNG をそのまま包める。sharp は ICO を書けないので、22バイトの
 * ヘッダを自分で付ける。仕様: ICONDIR(6) + ICONDIRENTRY(16) + PNG本体。
 */
function wrapAsIco(png, size) {
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0); // 予約領域
  header.writeUInt16LE(1, 2); // 1 = アイコン
  header.writeUInt16LE(1, 4); // 画像は1枚
  // 256px は 0 で表す仕様。いまは 32px なのでそのまま入る
  header.writeUInt8(size >= 256 ? 0 : size, 6);
  header.writeUInt8(size >= 256 ? 0 : size, 7);
  header.writeUInt8(0, 8); // パレット数（PNG なので 0）
  header.writeUInt8(0, 9); // 予約領域
  header.writeUInt16LE(1, 10); // プレーン数
  header.writeUInt16LE(32, 12); // 1画素あたりのビット数
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18); // 本体の位置
  return Buffer.concat([header, png]);
}

await mkdir(appDir, { recursive: true });

const svg = Buffer.from(icon);
await writeFile(path.join(appDir, "icon.svg"), icon);

// SVG を読めないブラウザ向けの控え
await sharp(svg, { density: 384 }).resize(96, 96).png().toFile(path.join(appDir, "icon.png"));

// iOS のホーム画面用。角丸は OS が付けるので、こちらは四角のまま出す
await sharp(svg, { density: 384 }).resize(180, 180).png().toFile(path.join(appDir, "apple-icon.png"));

// /favicon.ico を直接取りに来るブラウザとクローラ向け
const small = await sharp(svg, { density: 384 }).resize(32, 32).png().toBuffer();
await writeFile(path.join(appDir, "favicon.ico"), wrapAsIco(small, 32));

console.log("generated: app/icon.svg / icon.png / apple-icon.png / favicon.ico");
