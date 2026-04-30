import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Permite que a app leia arquivos fora de portal/ no monorepo (CLAUDE.md, agentes, output/, _shared/)
  outputFileTracingRoot: require("path").join(__dirname, ".."),
  experimental: {
    mdxRs: true,
  },
  pageExtensions: ["ts", "tsx", "mdx"],
};

export default nextConfig;
