import type { NextConfig } from "next";

// La app web reutiliza el contrato zod de @lobbydots/shared (ESM compilado).
// transpilePackages es una red de seguridad para la resolución en monorepo.
const nextConfig: NextConfig = {
  transpilePackages: ["@lobbydots/shared"],
};

export default nextConfig;
