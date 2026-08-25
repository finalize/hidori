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

/** 空文字は「未入力」として undefined に寄せる。フォームからは常に文字列が来るため */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? undefined : value))
    .optional();

export const createEventSchema = z.object({
  title: z.string().trim().min(1, "イベント名を入力してください").max(LIMITS.title),
  note: optionalText(LIMITS.note),
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
        .array(z.string().max(LIMITS.candidateLabel))
        .min(1, "候補日を1つ以上入力してください")
        .max(LIMITS.candidates, `候補日は ${LIMITS.candidates} 件までです`),
    ),
});

export const answerSchema = z.object({
  eventId: z.string().min(1),
  name: z.string().trim().min(1, "名前を入力してください").max(LIMITS.name),
  comment: optionalText(LIMITS.comment),
  /** candidate id -> mark。キーは数値の文字列で来る */
  marks: z.record(z.string(), z.enum(MARKS)),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type AnswerInput = z.infer<typeof answerSchema>;

/**
 * Server Action がフォームに返す形。useActionState でそのまま使う。
 * editUrl は初回回答のときだけ入る（別の端末から自分の回答を直すためのリンク）。
 */
export type ActionState = { error: string } | { ok: true; editUrl?: string } | null;
