import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fontes e logo lidos via fs pelo gerador de PDF — o rastreamento automático não os enxerga.
  outputFileTracingIncludes: {
    "/api/relatorios/pdf": ["./lib/relgov/pdf-assets/**/*", "./public/abrafesta-logo.png"],
  },
};

export default nextConfig;
