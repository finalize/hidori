export const THEME_COOKIE = "hidori_theme";

export type Theme = "light" | "dark";

/**
 * テーマの Cookie。1年保つ。
 * 個人を識別するものではなく表示の好みだけなので httpOnly にはしない
 * （クライアント側から即座に切り替えたくなったときのため）。
 */
export const THEME_COOKIE_OPTIONS = {
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
  sameSite: "lax",
} as const;
