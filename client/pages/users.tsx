import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";

import Layout from "../components/Layout";
import api from "../utils/api";
import { getCurrentUser } from "../utils/auth";

export default function Users() {
  const { t } = useTranslation();
  const router = useRouter();

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Bulk import
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkSpecializationId, setBulkSpecializationId] = useState("");
  const [bulkSpecializations, setBulkSpecializations] = useState<any[]>([]);
  const [bulkRole, setBulkRole] = useState<"TECHNICIAN" | "USER">("TECHNICIAN");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkResult, setBulkResult] = useState<{
    total: number;
    created: number;
    skipped: number;
  } | null>(null);

  useEffect(() => {
    loadUser();
    loadUsers();
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadUsers();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  const loadUser = async () => {
    const user = await getCurrentUser();
    setCurrentUser(user);
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/users/technicians");
      setUsers(res.data.technicians || []);
    } catch (err) {
      console.error(err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSpecializations = async () => {
    const res = await api.get("/specializations");
    setBulkSpecializations(res.data.specializations || []);
  };

  const openBulkModal = async () => {
    setBulkError(null);
    setBulkResult(null);
    setBulkOpen(true);

    if (bulkSpecializations.length === 0) {
      try {
        await loadSpecializations();
      } catch {
        setBulkError(t("users.bulkLoadSpecFailed"));
      }
    }
  };

  const handleBulkSubmit = async (e: any) => {
    e.preventDefault();
    setBulkError(null);
    setBulkResult(null);

    if (!bulkFile) {
      setBulkError(t("users.chooseExcel"));
      return;
    }

    if (bulkRole === "TECHNICIAN" && !bulkSpecializationId) {
      setBulkError(t("users.bulkSpecRequired"));
      return;
    }

    try {
      setBulkLoading(true);

      const formData = new FormData();
      formData.append("file", bulkFile);
      formData.append("role", bulkRole);

      if (bulkRole === "TECHNICIAN") {
        formData.append("specializationId", bulkSpecializationId);
      }

      const res = await api.post("/users/bulk-technicians", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setBulkResult(res.data?.result || res.data);
      await loadUsers();
    } catch (err: any) {
      setBulkError(err?.response?.data?.error || t("users.bulkImportFailed"));
    } finally {
      setBulkLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            {t("layout.users")}
          </h1>

          {(currentUser?.role === "IT_MANAGER" ||
            currentUser?.role === "SUPER_ADMIN") && (
            <div className="flex gap-3">
              <button
                onClick={() => router.push("/users/create")}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
              >
                {t("users.addEngineer")}
              </button>

              <button
                onClick={openBulkModal}
                className="px-6 py-2 border rounded-lg text-indigo-700 hover:bg-indigo-50"
              >
                {t("users.bulkCreateUser")}
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow overflow-hidden border">
          <table className="min-w-full divide-y">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-start text-xs font-semibold">
                  {t("users.colName")}
                </th>
                <th className="px-6 py-3 text-start text-xs font-semibold">
                  {t("users.colEmail")}
                </th>
                <th className="px-6 py-3 text-start text-xs font-semibold">
                  {t("users.colSpecialization")}
                </th>
                <th className="px-6 py-3 text-start text-xs font-semibold">
                  {t("users.colStatus")}
                </th>
                <th className="px-6 py-3 text-start text-xs font-semibold">
                  {t("users.colActiveTickets")}
                </th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-gray-500">
                    {t("users.noEngineersFound")}
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4">{user.name}</td>
                    <td className="px-6 py-4">{user.email}</td>
                    <td className="px-6 py-4">
                      {user.specialization?.name || t("ticketDetail.na")}
                    </td>
                    <td className="px-6 py-4">
                      {user.isOnline
                        ? t("users.online")
                        : t("users.offline")}
                    </td>
                    <td className="px-6 py-4">
                      {user._count?.assignedTickets || 0}{" "}
                      {t("users.activeSuffix")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* BULK MODAL */}
        {bulkOpen && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg w-full max-w-lg">
              <h3 className="text-lg font-semibold mb-2">
                {t("users.bulkTitle")}
              </h3>

              <p className="text-sm text-gray-600 mb-4">
                {t("users.bulkHint", { password: "123456" })}
              </p>

              {bulkError && (
                <div className="text-red-600 mb-2">{bulkError}</div>
              )}

              <form onSubmit={handleBulkSubmit} className="space-y-4">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) =>
                    setBulkFile(e.target.files?.[0] || null)
                  }
                  required
                />

                <select
                  value={bulkRole}
                  onChange={(e) =>
                    setBulkRole(e.target.value as any)
                  }
                >
                  <option value="TECHNICIAN">
                    {t("users.engineerWithSpec")}
                  </option>
                  <option value="USER">
                    {t("users.normalUser")}
                  </option>
                </select>

                {bulkRole === "TECHNICIAN" && (
                  <select
                    value={bulkSpecializationId}
                    onChange={(e) =>
                      setBulkSpecializationId(e.target.value)
                    }
                    required
                  >
                    <option value="">
                      {t("users.selectSpecialization")}
                    </option>
                    {bulkSpecializations.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  type="submit"
                  disabled={bulkLoading}
                  className="w-full bg-indigo-600 text-white py-2 rounded"
                >
                  {bulkLoading
                    ? t("users.importing")
                    : t("users.import")}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}