/**
 * ファビコンと OGP 画像を SVG から生成する。
 *   node scripts/generate-images.mjs
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

/*
  OGP 画像。URL を配るのがこのツールの全部なので、
  LINE や Slack に貼ったときに何のリンクか分かる必要がある。

  図柄は「大きく・平らで・色の差がはっきり」を守る。
  実物のスクリーンショットは白地に細い記号で、縮小にも量子化にも耐えない
  （portfolio のサムネイルを作るときに実測して分かった）。
*/
const TOKENS = {
  bg: "#ffffff",
  panel: "#0a6357",
  panelFg: "#ffffff",
  row: "#f4f6f7",
  yes: "#0a6b3d",
  maybe: "#7a5300",
  no: "#b02a21",
};

/** ○ △ × を太い線で描く。細いと縮小したとき消える */
function mark(kind, cx, cy, size) {
  const r = size / 2;
  const w = Math.round(size * 0.16);
  if (kind === "yes") {
    return `<circle cx="${cx}" cy="${cy}" r="${r - w / 2}" fill="none" stroke="${TOKENS.yes}" stroke-width="${w}"/>`;
  }
  if (kind === "maybe") {
    const h = r * 1.05;
    return `<path d="M ${cx} ${cy - h} L ${cx + r} ${cy + h * 0.75} L ${cx - r} ${cy + h * 0.75} Z" fill="none" stroke="${TOKENS.maybe}" stroke-width="${w}" stroke-linejoin="round"/>`;
  }
  const d = r * 0.8;
  return `<g stroke="${TOKENS.no}" stroke-width="${w}" stroke-linecap="round">
      <line x1="${cx - d}" y1="${cy - d}" x2="${cx + d}" y2="${cy + d}"/>
      <line x1="${cx + d}" y1="${cy - d}" x2="${cx - d}" y2="${cy + d}"/>
    </g>`;
}

const ROWS = [
  ["yes", "yes", "yes", "maybe"],
  ["yes", "no", "maybe", "yes"],
  ["maybe", "yes", "no", "yes"],
];

const FONT = "system-ui, -apple-system, 'Hiragino Sans', 'Noto Sans JP', sans-serif";

const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="${TOKENS.bg}"/>
  <rect width="470" height="630" fill="${TOKENS.panel}"/>
  <text x="64" y="286" font-family="${FONT}" font-size="86" font-weight="700" fill="${TOKENS.panelFg}">hidori</text>
  <text x="66" y="344" font-family="${FONT}" font-size="30" fill="${TOKENS.panelFg}" opacity="0.92">URL を配るだけで</text>
  <text x="66" y="388" font-family="${FONT}" font-size="30" fill="${TOKENS.panelFg}" opacity="0.92">日取りが決まります</text>
  ${ROWS.map((row, r) => {
    const y = 128 + r * 132;
    const cells = row
      .map((kind, c) => mark(kind, 690 + c * 128, y + 52, 62))
      .join("");
    return `<rect x="530" y="${y}" width="610" height="104" rx="16" fill="${TOKENS.row}"/>
      <rect x="558" y="${y + 40}" width="86" height="24" rx="12" fill="#d3dade"/>
      ${cells}`;
  }).join("")}
</svg>`;

await writeFile(path.join(root, "scripts", "og.svg"), og); // 目視確認用（公開はしない）
await sharp(Buffer.from(og)).png().toFile(path.join(root, "public", "og.png"));

console.log("generated: app/icon.svg / icon.png / apple-icon.png / favicon.ico / public/og.png");
