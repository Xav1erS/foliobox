"use client";

import { useState, useEffect } from "react";
import type { PlanType } from "@/lib/entitlement";

interface EntitlementState {
  planType: PlanType;
  loading: boolean;
}

export function useEntitlement(): EntitlementState {
  const [state, setState] = useState<EntitlementState>({
    planType: "FREE",
    loading: true,
  });

  useEffect(() => {
    fetch("/api/billing/me")
      .then((r) => (r.ok ? r.json() : { planType: "FREE" }))
      .then((d) => setState({ planType: d.planType as PlanType, loading: false }))
      .catch(() => setState({ planType: "FREE", loading: false }));
  }, []);

  return state;
}
