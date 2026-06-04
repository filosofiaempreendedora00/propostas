import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Esconde o indicador "N" do Next no dev (erros de build/runtime continuam aparecendo).
  devIndicators: false,
};

export default nextConfig;
