"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getCompanySettings,
  setCompanyLogo,
  setConsultantTerm,
} from "./actions";
import { DEFAULT_CONSULTANT_TERM } from "./terms";

export function useCompany() {
  const [logo, setLogoState] = useState<string | null>(null);
  const [consultantTerm, setTermState] = useState<string>(
    DEFAULT_CONSULTANT_TERM,
  );
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    getCompanySettings()
      .then((s) => {
        if (!alive) return;
        setLogoState(s.logo);
        setTermState(s.consultantTerm);
        setReady(true);
      })
      .catch(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  const setLogo = useCallback((l: string | null) => {
    setLogoState(l); // otimista
    void setCompanyLogo(l);
  }, []);

  const setTerm = useCallback((t: string) => {
    setTermState(t); // otimista
    void setConsultantTerm(t);
  }, []);

  return { logo, consultantTerm, ready, setLogo, setTerm };
}
