import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "../../../../lib/db";
import { adminCookie, editCookie, TOKEN_COOKIE_OPTIONS } from "../../../../lib/tokens";
import { tokenEquals } from "../../../../lib/id";

/**
 * `?t=<トークン>` で来た人の権限を Cookie に移し、URL からトークンを消してリダイレクトする。
 *
 * 別の端末から自分の回答を直したいときのための入口。
 * Cookie は Server Component の描画中には書けないので、Route Handler で受ける。
 * URL にトークンを残したままにすると、履歴やリファラから漏れる余地がある。
 */
export async function GET(request: Request, ctx: RouteContext<"/e/[id]/claim">) {
  const { id } = await ctx.params;
  const token = new URL(request.url).searchParams.get("t");
  if (!token) redirect(`/e/${id}`);

  const database = await db();
  const jar = await cookies();

  const event = await database
    .prepare("SELECT admin_token FROM events WHERE id = ?")
    .bind(id)
    .all<{ admin_token: string }>();
  const adminToken = event.results[0]?.admin_token;
  if (!adminToken) redirect("/");

  if (tokenEquals(adminToken, token)) {
    jar.set(adminCookie(id), token, TOKEN_COOKIE_OPTIONS(id));
    redirect(`/e/${id}/manage`);
  }

  const participant = await database
    .prepare("SELECT edit_token FROM participants WHERE event_id = ? AND edit_token = ?")
    .bind(id, token)
    .all<{ edit_token: string }>();
  if (participant.results[0]) {
    jar.set(editCookie(id), token, TOKEN_COOKIE_OPTIONS(id));
  }

  // 合っていてもいなくても同じ場所へ返す。合言葉の当たり外れを見分けさせない
  redirect(`/e/${id}`);
}
