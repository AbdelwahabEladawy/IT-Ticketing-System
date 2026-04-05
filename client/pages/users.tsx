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
  const [bulkRole, setBulkRole] = useState<"TECHNICIAN" | "USER">("USER");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkResult, setBulkResult] = useState<{
    total: number;
    created: number;
    skipped: number;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("USER");
  const [editSpecializationId, setEditSpecializationId] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

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
      const res = await api.get("/users");
      setUsers(res.data.users || []);
    } catch (err) {
      console.error(err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (user: any) => {
    setEditUser(user);
    setEditName(user.name || "");
    setEditEmail(user.email || "");
    setEditRole(user.role || "USER");
    setEditSpecializationId(user.specialization?.id || "");
    setEditOpen(true);
  };

  const closeEditModal = () => {
    setEditOpen(false);
    setEditUser(null);
    setEditName("");
    setEditEmail("");
    setEditRole("USER");
    setEditSpecializationId("");
  };

  const handleEditSubmit = async (e: any) => {
    e.preventDefault();
    if (!editUser) return;
    if (editName.trim().length === 0) {
      return;
    }

    try {
      const payload: any = {
        name: editName.trim(),
        email: editEmail.trim(),
      };
      if (editRole && currentUser?.role === "SUPER_ADMIN") {
        payload.role = editRole;
      }
      if (editSpecializationId) {
        payload.specializationId = editSpecializationId;
      }

      await api.patch(`/users/${editUser.id}`, payload);
      await loadUsers();
      closeEditModal();
    } catch (err: any) {
      console.error('Failed to update user', err);
    }
  };

  const handleDeleteUser = async (user: any) => {
    if (!confirm(`Delete user ${user.email}?`)) return;
    try {
      await api.delete(`/users/${user.id}`);
      await loadUsers();
    } catch (err: any) {
      console.error('Failed to delete user', err);
    }
  };

  const openResetModal = (user: any) => {
    setSelectedUser(user);
    setResetPassword("");
    setResetError(null);
    setResetOpen(true);
  };

  const closeResetModal = () => {
    setResetOpen(false);
    setSelectedUser(null);
    setResetPassword("");
    setResetError(null);
  };

  const handleResetSubmit = async (e: any) => {
    e.preventDefault();
    if (!selectedUser) return;
    if (resetPassword.trim().length < 6) {
      setResetError(t("users.passwordLengthError", { defaultValue: "Password must be at least 6 characters" }));
      return;
    }

    try {
      setResetLoading(true);
      await api.patch(`/users/${selectedUser.id}/password`, {
        newPassword: resetPassword,
      });
      closeResetModal();
    } catch (err: any) {
      setResetError(err?.response?.data?.error || t("users.resetPasswordFailed", { defaultValue: "Failed to reset password" }));
    } finally {
      setResetLoading(false);
    }
  };

  const loadSpecializations = async () => {
    const res = await api.get("/specializations");
    setBulkSpecializations(res.data.specializations || []);
  };

  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === "IT_MANAGER" || currentUser.role === "IT_ADMIN" || currentUser.role === "SUPER_ADMIN") {
      loadSpecializations().catch(() => {});
    }
    if (currentUser.role !== "SUPER_ADMIN") {
      setBulkRole("USER");
      setBulkSpecializationId("");
    }
  }, [currentUser]);

  const canCreateElevatedUsers = currentUser?.role === "SUPER_ADMIN";
  const canCreateUsers = Boolean(currentUser && currentUser.role !== "IT_ADMIN");

  const filteredUsers = users.filter((user) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      user.email?.toLowerCase().includes(query) ||
      user.name?.toLowerCase().includes(query)
    );
  });

  const openBulkModal = async () => {
    setBulkError(null);
    setBulkResult(null);
    if (!canCreateElevatedUsers) {
      setBulkRole("USER");
      setBulkSpecializationId("");
    }
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
    const effectiveBulkRole = canCreateElevatedUsers ? bulkRole : "USER";

    if (!bulkFile) {
      setBulkError(t("users.chooseExcel"));
      return;
    }

    if (effectiveBulkRole === "TECHNICIAN" && !bulkSpecializationId) {
      setBulkError(t("users.bulkSpecRequired"));
      return;
    }

    try {
      setBulkLoading(true);

      const formData = new FormData();
      formData.append("file", bulkFile);
      formData.append("role", effectiveBulkRole);

      if (effectiveBulkRole === "TECHNICIAN") {
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
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {t("layout.users")}
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              {t("users.manageHelpDesk", {
                defaultValue: "Search users by email, update details, reset passwords, or delete accounts.",
              })}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("users.searchPlaceholder", {
                defaultValue: "Search by name or email...",
              })}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:w-80"
            />

            {canCreateUsers && (
              <div className="flex gap-3 flex-wrap">
                <button
                  onClick={() => router.push("/users/create")}
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
                >
                  {canCreateElevatedUsers
                    ? t("users.addEngineer")
                    : t("users.createUser")}
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
                  {t("users.colRole", { defaultValue: "Role" })}
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
                <th className="px-6 py-3 text-end text-xs font-semibold">
                  {t("users.colActions", { defaultValue: "Actions" })}
                </th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-gray-500">
                    {t("users.noEngineersFound")}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4">{user.name}</td>
                    <td className="px-6 py-4">{user.email}</td>
                    <td className="px-6 py-4">{user.role}</td>
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
                    <td className="px-6 py-4 text-right space-x-2">
                      {currentUser?.role !== "IT_ADMIN" && (
                        <>
                          <button
                            onClick={() => openEditModal(user)}
                            className="rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-100"
                          >
                            {t("users.edit", { defaultValue: "Edit" })}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user)}
                            className="rounded-full border border-red-600 px-3 py-1 text-sm text-red-700 hover:bg-red-50"
                          >
                            {t("users.delete", { defaultValue: "Delete" })}
                          </button>
                          <button
                            onClick={() => openResetModal(user)}
                            className="rounded-full border border-indigo-600 px-3 py-1 text-sm text-indigo-700 hover:bg-indigo-50"
                          >
                            {t("users.resetPassword", { defaultValue: "Reset Password" })}
                          </button>
                        </>
                      )}
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
                  <option value="USER">
                    {t("users.normalUser")}
                  </option>
                  {canCreateElevatedUsers && (
                    <option value="TECHNICIAN">
                      {t("users.engineerWithSpec")}
                    </option>
                  )}
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

        {editOpen && editUser && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-md border border-slate-200 shadow-lg">
              <h3 className="text-xl font-semibold mb-3">
                {t("users.editUser", { defaultValue: "Edit user" })}
              </h3>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t("users.name", { defaultValue: "Name" })}
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t("users.email", { defaultValue: "Email" })}
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t("users.role", { defaultValue: "Role" })}
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    disabled={currentUser?.role !== "SUPER_ADMIN"}
                    className="mt-2 block w-full rounded-lg border-gray-300 bg-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="USER">USER</option>
                    {currentUser?.role === "SUPER_ADMIN" ? (
                      <>
                        <option value="TECHNICIAN">TECHNICIAN</option>
                        <option value="IT_ADMIN">IT_ADMIN</option>
                        <option value="IT_MANAGER">IT_MANAGER</option>
                        <option value="SOFTWARE_ENGINEER">SOFTWARE_ENGINEER</option>
                        <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                      </>
                    ) : (
                      editRole !== "USER" && <option value={editRole}>{editRole}</option>
                    )}
                  </select>
                </div>
                {(editRole === "TECHNICIAN" || editRole === "IT_ADMIN") && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      {t("users.specialization", { defaultValue: "Specialization" })}
                    </label>
                    <select
                      value={editSpecializationId}
                      onChange={(e) => setEditSpecializationId(e.target.value)}
                      className="mt-2 block w-full rounded-lg border-gray-300 bg-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="">{t("users.selectSpecialization")}</option>
                      {bulkSpecializations.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    {t("common.cancel", { defaultValue: "Cancel" })}
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    {t("users.saveChanges", { defaultValue: "Save changes" })}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {resetOpen && selectedUser && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg w-full max-w-md border border-slate-200 shadow-lg">
              <h3 className="text-xl font-semibold mb-3">
                {t("users.resetPasswordFor", {
                  defaultValue: "Reset password for {{name}}",
                  name: selectedUser.name,
                })}
              </h3>
              <form onSubmit={handleResetSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {t("users.newPassword", { defaultValue: "New password" })}
                  </label>
                  <input
                    type="password"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    className="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
                {resetError && (
                  <div className="text-sm text-red-600">{resetError}</div>
                )}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeResetModal}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    {t("common.cancel", { defaultValue: "Cancel" })}
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {resetLoading
                      ? t("common.saving", { defaultValue: "Saving..." })
                      : t("users.resetPassword", { defaultValue: "Reset Password" })}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
