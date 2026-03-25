import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import api from "../../utils/api";
import { getCurrentUser } from "../../utils/auth";

export default function CreateTicket() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    anydeskNumber: "",
    issueType: "", // Issue type selection (required)
    specializationId: "",
  });
  const [specializations, setSpecializations] = useState<any[]>([]);
  const [issueTypes, setIssueTypes] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadUser();
    loadSpecializations();
    loadIssueTypes();
  }, []);

  const loadUser = async () => {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
    // IT Admin cannot create tickets
    if (currentUser?.role === "IT_ADMIN") {
      router.push("/dashboard");
    }
  };

  const loadSpecializations = async () => {
    try {
      const response = await api.get("/specializations");
      setSpecializations(response.data.specializations);
    } catch (error) {
      console.error("Failed to load specializations");
    }
  };

  const loadIssueTypes = async () => {
    try {
      const response = await api.get("/issue-types");
      setIssueTypes(response.data);
    } catch (error) {
      console.error("Failed to load issue types");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // All issue types from the dropdown are predefined mapped types
      const problemType = formData.issueType ? "PREDEFINED" : "CUSTOM";

      const payload: any = {
        title: formData.title,
        description: formData.description,
        anydeskNumber: formData.anydeskNumber,
        problemType: problemType,
        issueType: formData.issueType || null, // Include issueType if selected
      };

      // All issue types route automatically via issueTypeMapping config

      await api.post("/tickets", payload);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create ticket");
    } finally {
      setLoading(false);
    }
  };

  const handleIssueTypeChange = (value: string) => {
    setFormData({
      ...formData,
      issueType: value,
      specializationId: "", // Clear specializationId - routing will be automatic
    });
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Create New Ticket
        </h1>
        <p className="mb-4 text-sm text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3">
          Tasks created by engineers are assigned to themselves automatically.
        </p>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-lg p-6 space-y-6 border border-gray-200"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              placeholder="Enter ticket title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              required
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              placeholder="Describe the issue..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Anydesk Number
            </label>
            <input
              type="text"
              value={formData.anydeskNumber}
              onChange={(e) =>
                setFormData({ ...formData, anydeskNumber: e.target.value })
              }
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              placeholder="Enter Anydesk number (optional)"
            />
            <p className="mt-1 text-sm text-gray-500">
              Enter your Anydesk number for remote access support
            </p>
          </div>

          {/* Issue Type Selection - Required */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Issue Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.issueType}
              onChange={(e) => handleIssueTypeChange(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            >
              <option value="">Select issue type</option>

              {issueTypes?.issueTypesByTeam &&
                Object.entries(issueTypes.issueTypesByTeam).map(
                  ([team, issues]: [string, any]) => (
                    <optgroup key={team} label={team}>
                      {issues.map((issue: string) => (
                        <option key={issue} value={issue}>
                          {issue}
                        </option>
                      ))}
                    </optgroup>
                  ),
                )}
            </select>
            <p className="mt-1 text-sm text-gray-500">
              {formData.issueType
                ? "Ticket will be automatically routed to the appropriate team"
                : "Select an issue type to route your ticket to the correct team"}
            </p>
          </div>

          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-indigo-700 hover:to-blue-700 transition-all disabled:opacity-50 shadow-lg hover:shadow-xl"
            >
              {loading ? "Creating..." : "Create Ticket"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
