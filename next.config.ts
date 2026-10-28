import type { NextConfig } from "next";

// Hospedagem compartilhada (cPanel/Passenger): `DEPLOY_TARGET=cpanel next build` gera
// `.next/standalone` (roda sem node_modules extra) e desliga o otimizador de imagens,
// que exigiria o binário nativo do `sharp` para Linux e mais CPU/memória no servidor.
const cpanel = process.env.DEPLOY_TARGET === "cpanel";

const nextConfig: NextConfig = {
  ...(cpanel ? { output: "standalone" as const, images: { unoptimized: true } } : {}),
  // Fontes e logo lidos via fs pelo gerador de PDF — o rastreamento automático não os enxerga.
  outputFileTracingIncludes: {
    "/api/relatorios/pdf": ["./lib/relgov/pdf-assets/**/*", "./public/abrafesta-logo.png"],
  },
};

export default nextConfig;
