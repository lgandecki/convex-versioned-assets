"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { api as convexApi } from "../../../convex/_generated/api";
import { createQueries } from "./queries";

// Use the real Convex-generated types
type API = typeof convexApi;

interface AdminUIContextValue {
  api: API;
  queries: ReturnType<typeof createQueries>;
}

interface AdminUIProviderProps {
  api: API;
  children: ReactNode;
}

const AdminUIContext = createContext<AdminUIContextValue | null>(null);

export function AdminUIProvider({ api, children }: AdminUIProviderProps) {
  const queries = useMemo(() => createQueries(api), [api]);

  return (
    <AdminUIContext.Provider value={{ api, queries }}>
      <div className="va-admin">
        {children}
      </div>
    </AdminUIContext.Provider>
  );
}

export function useAdminAPI(): API {
  const ctx = useContext(AdminUIContext);
  if (!ctx) {
    throw new Error(
      "useAdminAPI must be used within AdminUIProvider. " +
        "Wrap your app with <AdminUIProvider api={api}>."
    );
  }
  return ctx.api;
}

export function useAdminQueries() {
  const ctx = useContext(AdminUIContext);
  if (!ctx) {
    throw new Error(
      "useAdminQueries must be used within AdminUIProvider. " +
        "Wrap your app with <AdminUIProvider api={api}>."
    );
  }
  return ctx.queries;
}
