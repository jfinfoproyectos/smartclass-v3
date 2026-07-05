import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Evita que webpack bundlee shiki/rehype-pretty-code incorrectamente.
  // Estos paquetes acceden al sistema de archivos (para cargar temas/gramáticas)
  // y deben ejecutarse en el contexto Node.js nativo, no en el bundle de webpack.
  // Sin esto, los temas de Shiki no cargan en producción (Vercel).
  serverExternalPackages: [
    "shiki",
    "rehype-pretty-code",
    "@shikijs/rehype",
  ],
  outputFileTracingIncludes: {
    "/**/*": ["./node_modules/shiki/**/*", "./node_modules/@shikijs/**/*"],
  },
};

export default nextConfig;
