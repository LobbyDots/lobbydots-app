import type { NextConfig } from "next";
import path from "node:path";

// La app web reutiliza el contrato zod de @lobbydots/shared (ESM compilado).
const nextConfig: NextConfig = {
  transpilePackages: ["@lobbydots/shared"],
  // Alias explícito @/* → src/*. Refuerza el de tsconfig: algunos builds en
  // monorepo (Vercel) no leen el `paths` cuando el tsconfig extiende otro.
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(process.cwd(), "src"),
    };
    return config;
  },
};

export default nextConfig;
