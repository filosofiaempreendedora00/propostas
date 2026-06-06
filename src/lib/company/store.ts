"use client";

import { useCallback, useEffect, useState } from "react";
import { getCompanyBrand, setCompanyLogo } from "./actions";

// logo = versão p/ fundo ESCURO (clara) · logoDark = versão p/ fundo CLARO (escura)
export function useCompany() {
  const [logo, setLogoState] = useState<string | null>(null);
  const [logoDark, setLogoDarkState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    getCompanyBrand()
      .then((b) => {
        if (!alive) return;
        setLogoState(b.logo);
        setLogoDarkState(b.logoDark);
        setReady(true);
      })
      .catch(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  const setLogo = useCallback((l: string | null) => {
    setLogoState(l); // otimista
    setCompanyLogo("logo", l).catch(() => {});
  }, []);

  const setLogoDark = useCallback((l: string | null) => {
    setLogoDarkState(l); // otimista
    setCompanyLogo("logoDark", l).catch(() => {});
  }, []);

  return { logo, logoDark, ready, setLogo, setLogoDark };
}
