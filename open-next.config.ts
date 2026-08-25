import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// ISR を使わないので incremental cache（R2）は要らない。
// イベントページは常に最新であるべきなので force-dynamic で描く。
export default defineCloudflareConfig();
