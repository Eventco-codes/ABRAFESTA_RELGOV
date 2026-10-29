import type { NextConfig } from "next";

// Hospedagem compartilhada (cPanel/Passenger): `DEPLOY_TARGET=cpanel next build` gera
// `.next/standalone` (roda sem node_modules extra) e desliga o otimizador de imagens,
// que exigiria o binário nativo do `sharp` para Linux e mais CPU/memória no servidor.
const cpanel = process.env.DEPLOY_TARGET === "cpanel";

// Cabeçalhos de segurança em todas as rotas. É um painel interno (exige login): não deve ser
// indexado nem embutido em outro site. A CSP aqui é a parte que não depende de nonce — restringir
// `script-src` exige nonce por requisição (inline scripts do Next) e fica para uma etapa própria.
const securityHeaders = [
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  ...(cpanel ? { output: "standalone" as const, images: { unoptimized: true } } : {}),
  // Fontes e logos lidos via fs pelo gerador de PDF — o rastreamento automático não os enxerga.
  outputFileTracingIncludes: {
    "/api/relatorios/pdf": ["./lib/relgov/pdf-assets/**/*"],
  },
};

export default nextConfig;
