import type { MetadataRoute } from "next";

/**
 * イベントのページは URL を知っている人だけのもの。
 * ページ側でも noindex を出しているが、そもそも辿らせない。
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/e/" },
  };
}
