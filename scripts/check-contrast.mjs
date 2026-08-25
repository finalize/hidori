/**
 * 配色トークンのコントラスト比を検査する。pnpm check の一部として CI で走る。
 *   node scripts/check-contrast.mjs
 *
 * 自作の contrast-kit（https://www.npmjs.com/package/contrast-kit）を使う。
 * shogo-site の同名スクリプトを移植したもの。
 *
 * 注意: contrast-kit は CSS をテキストとして読むので、
 *   - 色はリテラルな hex で書くこと。oklch() / color-mix() / var() の間接参照は解決できない
 *   - セレクタは indexOf で探すので、`:root` はファイル中で最初に現れる `:root` である必要がある
 * これを破ると落ちるのではなく、黙って検査をすり抜ける。
 */
import { readFile } from "node:fs/promises";
import { auditPairs, extractRuleBlock, parseCssVariables, suggestAccessible } from "contrast-kit";

const CSS_PATH = new URL("../app/globals.css", import.meta.url);

/**
 * 実際に画面で重なる組み合わせだけを並べる。
 * 機械的に全組み合わせを見ても、重ねない組で落ちるだけで意味がない。
 */
const PAIRS = [
  { label: "本文", fg: "--fg", bg: "--surface" },
  { label: "本文（ページ背景の上）", fg: "--fg", bg: "--bg" },
  { label: "補足テキスト", fg: "--fg-dim", bg: "--surface" },
  { label: "補足テキスト（ページ背景の上）", fg: "--fg-dim", bg: "--bg" },
  { label: "リンク・見出し", fg: "--accent", bg: "--surface" },
  { label: "リンク（ページ背景の上）", fg: "--accent", bg: "--bg" },
  { label: "主ボタンの文字", fg: "--accent-fg", bg: "--accent" },
  { label: "○ の記号", fg: "--yes", bg: "--surface" },
  { label: "△ の記号", fg: "--maybe", bg: "--surface" },
  { label: "× の記号", fg: "--no", bg: "--surface" },
  { label: "表の見出し", fg: "--fg-dim", bg: "--surface-2" },
  { label: "表の本文", fg: "--fg", bg: "--surface-2" },
  // 枠線は文字ではないので WCAG 1.4.11 の 3:1。ただし判断が分かれるので参考表示に留め、
  // これだけではビルドを落とさない
  { label: "枠線（参考・非テキスト 3:1）", fg: "--border", bg: "--surface", large: true, advisory: true },
];

const THEMES = [
  { name: "light", selector: ":root" },
  // ダークは2か所に書いてある（OS 設定に従う側と、手動で切り替えた側）。両方検査する
  { name: "dark (OS 設定)", selector: ':root:not([data-theme="light"])' },
  { name: "dark (手動切替)", selector: ':root[data-theme="dark"]' },
];

const css = await readFile(CSS_PATH, "utf8");

function readPalette(selector) {
  const block = extractRuleBlock(css, selector);
  if (block === undefined) {
    throw new Error(`セレクタ ${selector} が globals.css に見つかりません`);
  }
  return parseCssVariables(block);
}

// ライトを土台にして、ダークは上書きした変数だけを重ねる
const base = readPalette(THEMES[0].selector);
const palettes = THEMES.map((theme) => ({
  ...theme,
  palette: theme.name === "light" ? base : { ...base, ...readPalette(theme.selector) },
}));

// ダークの2ブロックがズレていないことを確かめる。
// 片方だけ直したときに、検査を通ったのに実際の画面は違う色、という事故を防ぐ
const [, osDark, manualDark] = palettes;
const drifted = Object.keys({ ...osDark.palette, ...manualDark.palette }).filter(
  (name) => osDark.palette[name] !== manualDark.palette[name],
);
if (drifted.length > 0) {
  console.error(
    `ダークの2ブロックで値が違います: ${drifted.join(", ")}\n` +
      `  ${THEMES[1].selector}\n  ${THEMES[2].selector}\n  両方を同じ値にしてください。`,
  );
  process.exit(1);
}

let failures = 0;

for (const { name, palette } of palettes) {
  console.log(`\n  ${name}`);

  const missing = PAIRS.flatMap(({ fg, bg }) => [fg, bg]).filter((token) => !palette[token]);
  if (missing.length > 0) {
    throw new Error(`${name}: 変数が見つかりません: ${[...new Set(missing)].join(", ")}`);
  }

  const results = auditPairs(
    PAIRS.map((pair) => ({
      name: pair.label,
      fg: palette[pair.fg],
      bg: palette[pair.bg],
      large: pair.large ?? false,
    })),
  );

  for (const [index, result] of results.entries()) {
    const { fg, bg, advisory = false } = PAIRS[index];
    const mark = result.passes ? "OK  " : advisory ? "--  " : "NG  ";
    const ratio = `${result.ratio.toFixed(2)}:1`.padStart(8);
    console.log(
      `    ${mark}${result.name.padEnd(30)} ${`${fg} / ${bg}`.padEnd(26)} ${ratio}  ${result.level}`,
    );

    if (result.passes || advisory) continue;
    failures++;

    // 「足りない」だけでなく直し方も出す
    const fix = suggestAccessible(result.fg, result.bg, { large: result.large });
    console.log(
      fix === undefined
        ? "        → 明度を振り切っても届きません。色相から見直す必要があります"
        : `        → ${fg} を ${fix.color} にすれば ${fix.ratio.toFixed(2)}:1`,
    );
  }
}

if (failures > 0) {
  console.error(`\n${failures} 件が基準を満たしていません。`);
  process.exit(1);
}
console.log("\nテキストの組み合わせはすべて基準を満たしています（-- は参考項目）。\n");
