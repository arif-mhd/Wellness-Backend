"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { apiFetch } from "@/lib/apiFetch";

interface AdminProfile {
  name: string;
  email: string;
  avatarUrl: string;
}

interface AdminProfileContextValue {
  profile: AdminProfile;
  updateProfile: (patch: Partial<AdminProfile>) => void;
  refresh: () => void;
}

const DEFAULT: AdminProfile = { name: "", email: "", avatarUrl: "" };

const AdminProfileContext = createContext<AdminProfileContextValue>({
  profile: DEFAULT,
  updateProfile: () => {},
  refresh: () => {},
});

export function AdminProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<AdminProfile>(DEFAULT);

  const refresh = useCallback(() => {
    apiFetch("/api/admin/settings/profile")
      .then(r => r.json())
      .then(data => {
        const p = data.profile ?? {};
        setProfile({
          name: p.fullName ?? "",
          email: p.email ?? "",
          avatarUrl: p.avatarUrl ?? "",
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const updateProfile = useCallback((patch: Partial<AdminProfile>) => {
    setProfile(prev => ({ ...prev, ...patch }));
  }, []);

  return (
    <AdminProfileContext.Provider value={{ profile, updateProfile, refresh }}>
      {children}
    </AdminProfileContext.Provider>
  );
}

export function useAdminProfile() {
  return useContext(AdminProfileContext);
}
