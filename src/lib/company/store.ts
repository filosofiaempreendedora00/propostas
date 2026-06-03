"use client";

import { useCallback, useEffect, useState } from "react";
import { getCompanyLogo, setCompanyLogo } from "./actions";

export function useCompany() {
  const [logo, setLogoState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    getCompanyLogo()
      .then((l) => alive && (setLogoState(l), setReady(true)))
      .catch(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  const setLogo = useCallback((l: string | null) => {
    setLogoState(l); // otimista
    void setCompanyLogo(l);
  }, []);

  return { logo, ready, setLogo };
}
