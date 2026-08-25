/**
 * 権限の根拠になる Cookie。
 *
 * 調整さんは URL さえ知っていれば誰でも他人の回答を書き換えられる。
 * hidori は回答時に発行したトークンを持っている人だけが自分の行を直せるようにする。
 *
 * path をイベント単位に絞るので、別のイベントのページには送られない。
 * イベントに参加するほど Cookie は増えるが、path が違うため1リクエストに乗るのは1つだけ。
 */

/** 主催者トークン。候補の追加とイベント削除に要る */
export function adminCookie(eventId: string): string {
  return `hidori_admin_${eventId}`;
}

/** 回答者トークン。自分の行の更新と削除に要る */
export function editCookie(eventId: string): string {
  return `hidori_edit_${eventId}`;
}

/**
 * イベントの保存期間より長く持たせても意味がないので、90日に揃える。
 * httpOnly にするのは、この値が権限そのものだから（スクリプトから読めてよい理由がない）。
 */
export function TOKEN_COOKIE_OPTIONS(eventId: string) {
  return {
    path: `/e/${eventId}`,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 90,
  } as const;
}
