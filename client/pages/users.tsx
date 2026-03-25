import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import api from "../utils/api";
import { getCurrentUser } from "../utils/auth";

export default function Users() {
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Bulk import technicians
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkSpecializationId, setBulkSpecializationId] = useState<string>("");
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

  // Reload when component becomes visible (after navigation back)
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
      const response = await api.get("/users/technicians");
      console.log("Loaded technicians:", response.data.technicians);
      const technicians = response.data.technicians || [];
      console.log(`Total technicians loaded: ${technicians.length}`);
      setUsers(technicians);
    } catch (error) {
      console.error("Failed to load technicians:", error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSpecializations = async () => {
    const response = await api.get("/specializations");
    setBulkSpecializations(response.data.specializations || []);
  };

  const openBulkModal = async () => {
    setBulkError(null);
    setBulkResult(null);
    setBulkOpen(true);
    if (bulkSpecializations.length === 0) {
      try {
        await loadSpecializations();
      } catch (e) {
        setBulkError("Failed to load specializations");
      }
    }
  };

  const handleBulkSubmit = async (e: any) => {
    e.preventDefault();
    setBulkError(null);
    setBulkResult(null);

    if (!bulkFile) {
      setBulkError("Please choose an Excel file (.xlsx/.xls)");
      return;
    }

    if (bulkRole === "TECHNICIAN" && !bulkSpecializationId) {
      setBulkError("Please select a specialization for imported technicians");
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

      const response = await api.post(
        "/users/bulk-technicians",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setBulkResult(response.data?.result || response.data);
      await loadUsers();
    } catch (err: any) {
      setBulkError(err?.response?.data?.error || "Bulk import failed");
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
          <h1 className="text-3xl font-bold text-gray-900">Technicians</h1>
          {(currentUser?.role === "IT_MANAGER" ||
            currentUser?.role === "SUPER_ADMIN") && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/users/create")}
                className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-6 py-2 rounded-lg hover:from-indigo-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
              >
                Add Technician
              </button>
              <button
                onClick={openBulkModal}
                className="px-6 py-2 rounded-lg border border-indigo-200 bg-white hover:bg-indigo-50 text-indigo-700 transition-colors shadow-sm"
              >
                Bulk create user
              </button>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-indigo-50 to-blue-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Specialization
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Active Tickets
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No technicians found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {user.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {user.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          {user.specialization?.name || "N/A"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            user.isOnline
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {user.isOnline ? "ONLINE" : "OFFLINE"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">
                          {user._count?.assignedTickets || 0} active
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {bulkOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Bulk create user
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Import emails from Excel. Default password: <b>123456</b>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setBulkOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              {bulkError && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                  {bulkError}
                </div>
              )}

              {bulkResult && (
                <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm">
                  Created: {bulkResult.created}, Skipped: {bulkResult.skipped}, Total: {bulkResult.total}
                </div>
              )}

              <form onSubmit={handleBulkSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Excel file (emails)
                  </label>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      setBulkFile(f);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Create as
                  </label>
                  <select
                    value={bulkRole}
                    onChange={(e) => {
                      const v = e.target.value as "TECHNICIAN" | "USER";
                      setBulkRole(v);
                      if (v === "USER") setBulkSpecializationId("");
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  >
                    <option value="TECHNICIAN">Technician (requires specialization)</option>
                    <option value="USER">Normal User (no specialization)</option>
                  </select>
                </div>

                {bulkRole === "TECHNICIAN" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Specialization
                    </label>
                    <select
                      value={bulkSpecializationId}
                      onChange={(e) => setBulkSpecializationId(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                      required
                    >
                      <option value="">Select specialization</option>
                      {bulkSpecializations.map((spec) => (
                        <option key={spec.id} value={spec.id}>
                          {spec.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {bulkRole === "USER" && (
                  <div className="text-xs text-gray-500">
                    Note: these new accounts won't appear in the technician list.
                  </div>
                )}

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={bulkLoading}
                    className="flex-1 bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-indigo-700 hover:to-blue-700 transition-all disabled:opacity-50 shadow-lg hover:shadow-xl"
                  >
                    {bulkLoading ? "Importing..." : "Import"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkOpen(false)}
                    disabled={bulkLoading}
                    className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
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
