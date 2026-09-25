"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Profile, UserRole } from "@/types/crm";
import { setUserRole } from "@/lib/actions/users";
import { Select } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/states";
import { formatDateES } from "@/lib/utils/format";

export function UsersManager({ profiles, myId }: { profiles: Profile[]; myId: string }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function changeRole(id: string, role: UserRole) {
    setPendingId(id);
    setError(null);
    const res = await setUserRole(id, role);
    setPendingId(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  if (profiles.length === 0) {
    return <EmptyState title="Sin usuarios" message="Todavía no hay usuarios registrados." />;
  }

  return (
    <div>
      {error && (
        <p role="alert" className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      )}
      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-neutral-100 text-xs text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Alta</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
              <tr key={p.id} className="border-b border-neutral-50 last:border-0 dark:border-neutral-800">
                <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">
                  {p.email ?? "—"}
                  {p.id === myId && (
                    <span className="ml-2 text-xs font-normal text-neutral-500">(tú)</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {p.id === myId ? (
                    <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                      {p.role === "admin" ? "Admin" : "Miembro"} (no puedes cambiar tu propio rol)
                    </span>
                  ) : (
                    <Select
                      value={p.role}
                      disabled={pendingId === p.id}
                      onChange={(e) => changeRole(p.id, e.target.value as UserRole)}
                      className="!w-auto"
                      aria-label={`Rol de ${p.email}`}
                    >
                      <option value="member">Miembro</option>
                      <option value="admin">Admin</option>
                    </Select>
                  )}
                </td>
                <td className="px-4 py-3 text-neutral-600 dark:text-neutral-300">{formatDateES(p.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-neutral-500 dark:text-neutral-400">
        Miembro: ve, crea y edita toda la cartera. Admin: además puede eliminar leads, limpiar duplicados y gestionar roles.
      </p>
    </div>
  );
}
