"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { db, touchEvent, type ParticipantRow } from "../lib/db";
import { newEventId, newToken, tokenEquals } from "../lib/id";
import { adminCookie, editCookie, TOKEN_COOKIE_OPTIONS } from "../lib/tokens";
import { answerSchema, createEventSchema, LIMITS, type ActionState } from "../lib/schema";
import { THEME_COOKIE, THEME_COOKIE_OPTIONS } from "../lib/theme";

/**
 * レート制限。誰でも作成できる公開ツールなので、連打と自動化に上限を設ける。
 * Cloudflare の period は 10 秒か 60 秒しか取れないので、これはバースト対策。
 * 1日あたりの上限にはならない。
 */
async function underLimit(which: "CREATE_LIMIT" | "WRITE_LIMIT"): Promise<boolean> {
  const { env } = await getCloudflareContext({ async: true });
  const limiter = env[which];
  // ローカル開発ではバインディングが無いことがある。その場合は素通しでよい
  if (!limiter) return true;
  const ip = (await headers()).get("CF-Connecting-IP") ?? "unknown";
  const { success } = await limiter.limit({ key: `${which}:${ip}` });
  return success;
}

export async function createEvent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await underLimit("CREATE_LIMIT"))) {
    return { error: "短い時間に作りすぎです。少し待ってからもう一度お試しください。" };
  }

  const parsed = createEventSchema.safeParse({
    title: formData.get("title") ?? "",
    note: formData.get("note") ?? "",
    candidates: formData.get("candidates") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "入力を確認してください。" };
  }

  const { title, note, candidates } = parsed.data;
  const id = newEventId();
  const adminToken = newToken();
  const database = await db();

  await database.batch([
    database
      .prepare(
        `INSERT INTO events (id, title, note, admin_token, created_at, updated_at)
         VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`,
      )
      .bind(id, title, note ?? null, adminToken),
    ...candidates.map((label, index) =>
      database
        .prepare("INSERT INTO candidates (event_id, label, position) VALUES (?, ?, ?)")
        .bind(id, label, index),
    ),
  ]);

  // 主催者の権限はこの Cookie が根拠になる。画面でも一度だけリンクを見せる
  (await cookies()).set(adminCookie(id), adminToken, TOKEN_COOKIE_OPTIONS(id));

  // redirect は例外を投げて制御を移すので、try の外で呼ぶ
  redirect(`/e/${id}?created=1`);
}

export async function submitAnswer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await underLimit("WRITE_LIMIT"))) {
    return { error: "短い時間に送りすぎです。少し待ってからもう一度お試しください。" };
  }

  const eventId = String(formData.get("eventId") ?? "");
  const marks: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("mark_")) marks[key.slice("mark_".length)] = String(value);
  }

  const parsed = answerSchema.safeParse({
    eventId,
    name: formData.get("name") ?? "",
    comment: formData.get("comment") ?? "",
    marks,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "入力を確認してください。" };
  }

  const database = await db();
  const jar = await cookies();
  const myToken = jar.get(editCookie(eventId))?.value;

  // 候補がこのイベントのものか確かめる。他のイベントの候補 id を混ぜられないように
  const candidates = await database
    .prepare("SELECT id FROM candidates WHERE event_id = ?")
    .bind(eventId)
    .all<{ id: number }>();
  const valid = new Set(candidates.results.map((row) => row.id));
  if (valid.size === 0) return { error: "このイベントは見つかりませんでした。" };

  const entries = Object.entries(parsed.data.marks)
    .map(([candidateId, mark]) => ({ candidateId: Number(candidateId), mark }))
    .filter((entry) => valid.has(entry.candidateId));

  // 既に自分の行があるなら更新、無ければ追加
  let participant: ParticipantRow | undefined;
  if (myToken) {
    const found = await database
      .prepare("SELECT * FROM participants WHERE event_id = ? AND edit_token = ?")
      .bind(eventId, myToken)
      .all<ParticipantRow>();
    participant = found.results[0];
  }

  if (!participant) {
    const count = await database
      .prepare("SELECT COUNT(*) AS n FROM participants WHERE event_id = ?")
      .bind(eventId)
      .all<{ n: number }>();
    if ((count.results[0]?.n ?? 0) >= LIMITS.participants) {
      return { error: `このイベントの参加者は ${LIMITS.participants} 人までです。` };
    }

    const editToken = newToken();
    const inserted = await database
      .prepare(
        `INSERT INTO participants (event_id, name, comment, edit_token, created_at, updated_at)
         VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
         RETURNING *`,
      )
      .bind(eventId, parsed.data.name, parsed.data.comment ?? null, editToken)
      .all<ParticipantRow>();
    participant = inserted.results[0];
    if (!participant) return { error: "保存できませんでした。もう一度お試しください。" };

    // この Cookie が「自分の行を直せる」根拠になる
    jar.set(editCookie(eventId), editToken, TOKEN_COOKIE_OPTIONS(eventId));
  } else {
    await database
      .prepare(
        "UPDATE participants SET name = ?, comment = ?, updated_at = datetime('now') WHERE id = ?",
      )
      .bind(parsed.data.name, parsed.data.comment ?? null, participant.id)
      .run();
  }

  const participantId = participant.id;
  await database.batch([
    database.prepare("DELETE FROM answers WHERE participant_id = ?").bind(participantId),
    ...entries.map((entry) =>
      database
        .prepare("INSERT INTO answers (participant_id, candidate_id, mark) VALUES (?, ?, ?)")
        .bind(participantId, entry.candidateId, entry.mark),
    ),
    // 使われているイベントは寿命が延びる
    touchEvent(database, eventId),
  ]);

  revalidatePath(`/e/${eventId}`);
  return { ok: true };
}

/** 自分の行だけを消す。他人の行は Cookie のトークンが合わないので消せない */
export async function deleteMyAnswer(eventId: string): Promise<ActionState> {
  const jar = await cookies();
  const myToken = jar.get(editCookie(eventId))?.value;
  if (!myToken) return { error: "この端末からは削除できません。" };

  const database = await db();
  const found = await database
    .prepare("SELECT * FROM participants WHERE event_id = ? AND edit_token = ?")
    .bind(eventId, myToken)
    .all<ParticipantRow>();
  const participant = found.results[0];
  if (!participant || !tokenEquals(participant.edit_token, myToken)) {
    return { error: "この端末からは削除できません。" };
  }

  await database.batch([
    database.prepare("DELETE FROM answers WHERE participant_id = ?").bind(participant.id),
    database.prepare("DELETE FROM participants WHERE id = ?").bind(participant.id),
    touchEvent(database, eventId),
  ]);

  jar.delete(editCookie(eventId));
  revalidatePath(`/e/${eventId}`);
  return { ok: true };
}

/** イベントごと消す。主催者トークンを持っている人だけ */
export async function deleteEvent(eventId: string): Promise<ActionState> {
  const jar = await cookies();
  const token = jar.get(adminCookie(eventId))?.value;

  const database = await db();
  const found = await database
    .prepare("SELECT admin_token FROM events WHERE id = ?")
    .bind(eventId)
    .all<{ admin_token: string }>();
  const admin = found.results[0]?.admin_token;
  if (!tokenEquals(admin, token)) {
    return { error: "このイベントを削除する権限がありません。" };
  }

  // D1 は外部キー制約が既定で無効なので、子から順に消す
  await database.batch([
    database
      .prepare(
        `DELETE FROM answers WHERE participant_id IN
           (SELECT id FROM participants WHERE event_id = ?)`,
      )
      .bind(eventId),
    database.prepare("DELETE FROM participants WHERE event_id = ?").bind(eventId),
    database.prepare("DELETE FROM candidates WHERE event_id = ?").bind(eventId),
    database.prepare("DELETE FROM events WHERE id = ?").bind(eventId),
  ]);

  jar.delete(adminCookie(eventId));
  jar.delete(editCookie(eventId));
  redirect("/?deleted=1");
}

/** 候補日を後から足す。主催者だけ */
export async function addCandidates(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const eventId = String(formData.get("eventId") ?? "");
  const jar = await cookies();
  const token = jar.get(adminCookie(eventId))?.value;

  const database = await db();
  const found = await database
    .prepare("SELECT admin_token FROM events WHERE id = ?")
    .bind(eventId)
    .all<{ admin_token: string }>();
  if (!tokenEquals(found.results[0]?.admin_token, token)) {
    return { error: "候補を追加する権限がありません。" };
  }

  const labels = String(formData.get("candidates") ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && line.length <= LIMITS.candidateLabel);
  if (labels.length === 0) return { error: "候補日を入力してください。" };

  const existing = await database
    .prepare("SELECT COUNT(*) AS n, MAX(position) AS last FROM candidates WHERE event_id = ?")
    .bind(eventId)
    .all<{ n: number; last: number | null }>();
  const current = existing.results[0]?.n ?? 0;
  if (current + labels.length > LIMITS.candidates) {
    return { error: `候補日は合わせて ${LIMITS.candidates} 件までです。` };
  }
  const start = (existing.results[0]?.last ?? -1) + 1;

  await database.batch([
    ...labels.map((label, index) =>
      database
        .prepare("INSERT INTO candidates (event_id, label, position) VALUES (?, ?, ?)")
        .bind(eventId, label, start + index),
    ),
    touchEvent(database, eventId),
  ]);

  revalidatePath(`/e/${eventId}`);
  return { ok: true };
}

/** 配色の切り替え。表示の好みだけなので検証は値の範囲チェックのみ */
export async function setTheme(theme: string): Promise<void> {
  if (theme !== "light" && theme !== "dark") return;
  (await cookies()).set(THEME_COOKIE, theme, THEME_COOKIE_OPTIONS);
}
