import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;

// next dev でも Cloudflare のバインディング（D1 など）を使えるようにする
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
initOpenNextCloudflareForDev();
