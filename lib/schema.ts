import { z } from "zod";

/**
 * Server Action が受け取る入力の検証。
 *
 * 誰でも作成できる公開ツールなので、フォームから来た値をそのまま DB に入れない。
 * 上限はここ1か所にまとめ、画面の maxLength と cron の掃除がこの値を参照する。
 */

export const LIMITS = {
  title: 100,
  note: 500,
  candidateLabel: 60,
  candidates: 50,
  name: 40,
  comment: 200,
  /** 1イベントあたりの参加者数。挿入時に件数を数えて弾く */
  participants: 200,
} as const;

/** 出欠の記号。DB の CHECK 制約と揃える */
export const MARKS = ["yes", "maybe", "no"] as const;
export type Mark = (typeof MARKS)[number];

/** 表示に使う記号。調整さんに倣うが、読み上げ用の名前も持つ */
export const MARK_LABEL: Record<Mark, { symbol: string; text: string }> = {
  yes: { symbol: "○", text: "参加できる" },
  maybe: { symbol: "△", text: "たぶん参加できる" },
  no: { symbol: "×", text: "参加できない" },
};

/**
 * 空文字は「未入力」として undefined に寄せる。フォームからは常に文字列が来るため。
 *
 * メッセージは必ず日本語で書く。zod の既定は英語（"Too big: expected string to have
 * <=100 characters"）で、そのまま画面に出てしまう。実際に一度そうなった。
 */
const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label}は ${max} 文字までです`)
    .transform((value) => (value === "" ? undefined : value))
    .optional();

export const createEventSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "イベント名を入力してください")
    .max(LIMITS.title, `イベント名は ${LIMITS.title} 文字までです`),
  note: optionalText(LIMITS.note, "ひとこと"),
  /**
   * 候補日は1行1件のテキストで受け取る。カレンダー UI より先に、
   * 貼り付けで作れることを優先する（調整さんも同じ入力を持っている）。
   */
  candidates: z
    .string()
    .trim()
    .min(1, "候補日を1つ以上入力してください")
    .transform((value) =>
      value
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== ""),
    )
    .pipe(
      z
        .array(
          z
            .string()
            .max(LIMITS.candidateLabel, `候補日の1行は ${LIMITS.candidateLabel} 文字までです`),
        )
        .min(1, "候補日を1つ以上入力してください")
        .max(LIMITS.candidates, `候補日は ${LIMITS.candidates} 件までです`),
    ),
});

export const answerSchema = z.object({
  eventId: z.string().min(1, "イベントが指定されていません"),
  name: z
    .string()
    .trim()
    .min(1, "名前を入力してください")
    .max(LIMITS.name, `名前は ${LIMITS.name} 文字までです`),
  comment: optionalText(LIMITS.comment, "ひとこと"),
  /** candidate id -> mark。キーは数値の文字列で来る */
  marks: z.record(z.string(), z.enum(MARKS, "選べる回答は ○ △ × のいずれかです")),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type AnswerInput = z.infer<typeof answerSchema>;

/**
 * Server Action がフォームに返す形。useActionState でそのまま使う。
 * editUrl は初回回答のときだけ入る（別の端末から自分の回答を直すためのリンク）。
 */
export type ActionState = { error: string } | { ok: true; editUrl?: string } | null;
