import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { Mark } from "./schema";

/**
 * D1 への薄いラッパ。ORM は挟まない。
 * テーブルは4つでスキーマの変化も見込みが薄く、`.bind().all<T>()` で十分型が付く。
 */

export type EventRow = {
  id: string;
  title: string;
  note: string | null;
  admin_token: string;
  created_at: string;
  updated_at: string;
};

export type CandidateRow = {
  id: number;
  event_id: string;
  label: string;
  starts_at: string | null;
  position: number;
};

export type ParticipantRow = {
  id: number;
  event_id: string;
  name: string;
  comment: string | null;
  edit_token: string;
  created_at: string;
  updated_at: string;
};

export type AnswerRow = {
  participant_id: number;
  candidate_id: number;
  mark: Mark;
};

export async function db(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true });
  return env.DB;
}

/**
 * イベント1件の表示に要るものをまとめて取る。
 * 4本を batch にして往復を1回に抑える。
 */
export async function loadEvent(id: string) {
  const database = await db();
  const [event, candidates, participants, answers] = await database.batch([
    database.prepare("SELECT * FROM events WHERE id = ?").bind(id),
    database
      .prepare("SELECT * FROM candidates WHERE event_id = ? ORDER BY position, id")
      .bind(id),
    database
      .prepare("SELECT * FROM participants WHERE event_id = ? ORDER BY id")
      .bind(id),
    database
      .prepare(
        `SELECT a.* FROM answers a
           JOIN participants p ON p.id = a.participant_id
          WHERE p.event_id = ?`,
      )
      .bind(id),
  ]);

  const row = (event.results as EventRow[])[0];
  if (!row) return undefined;

  return {
    event: row,
    candidates: candidates.results as CandidateRow[],
    participants: participants.results as ParticipantRow[],
    answers: answers.results as AnswerRow[],
  };
}

export type LoadedEvent = NonNullable<Awaited<ReturnType<typeof loadEvent>>>;

/**
 * イベントの最終更新を今にする。保存期間はこの値から数えるので、
 * 誰かが回答するたびに寿命が延びる（使われているものは消えない）。
 */
export function touchEvent(database: D1Database, eventId: string) {
  return database
    .prepare("UPDATE events SET updated_at = datetime('now') WHERE id = ?")
    .bind(eventId);
}
