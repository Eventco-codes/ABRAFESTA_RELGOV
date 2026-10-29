import type { MetadataRoute } from "next";

// Painel interno: nada deve ser indexado (inclusive a tela de login).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
