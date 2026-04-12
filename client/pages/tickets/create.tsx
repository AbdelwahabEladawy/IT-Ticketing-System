import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import Layout from "../../components/Layout";
import api from "../../utils/api";
import { getCurrentUser } from "../../utils/auth";

export default function CreateTicket() {
  const { t } = useTranslation();
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const [user, setUser] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    anydeskNumber: "",
    issueType: "",
    specializationId: "",
  });
  const [specializations, setSpecializations] = useState<any[]>([]);
  const [issueTypes, setIssueTypes] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [anydeskError, setAnydeskError] = useState("");
  const [prefilledFromFirewall, setPrefilledFromFirewall] = useState(false);
  const [prefilledFields, setPrefilledFields] = useState({
    title: false,
    description: false,
    issueType: false,
    anydeskNumber: false,
  });

  useEffect(() => {
    loadUser();
    loadSpecializations();
    loadIssueTypes();
  }, []);

  useEffect(() => {
    if (!router.isReady) return;

    const readQueryValue = (value: string | string[] | undefined): string => {
      if (!value) return "";
      return Array.isArray(value) ? value[0] : value;
    };

    const title = readQueryValue(router.query.title).trim();
    const description = readQueryValue(router.query.description).trim();
    const category = readQueryValue(router.query.category).trim();
    const anydesk = readQueryValue(router.query.anydesk).trim();

    const hasPrefill = Boolean(title || description || category || anydesk);
    if (!hasPrefill) return;

    setFormData((prev) => ({
      ...prev,
      title: title || prev.title,
      description: description || prev.description,
      issueType: category || prev.issueType,
      anydeskNumber: anydesk || prev.anydeskNumber,
    }));

    setPrefilledFields({
      title: Boolean(title),
      description: Boolean(description),
      issueType: Boolean(category),
      anydeskNumber: Boolean(anydesk),
    });
    setPrefilledFromFirewall(true);
  }, [router.isReady, router.query]);

  useEffect(() => {
    if (!prefilledFromFirewall || !formRef.current) return;
    formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [prefilledFromFirewall]);

  useEffect(() => {
    if (!prefilledFromFirewall || !issueTypes?.issueTypesByTeam || !formData.issueType) {
      return;
    }

    const normalizedCurrent = formData.issueType.trim().toLowerCase();
    const allIssueTypes: string[] = [];

    Object.entries(issueTypes.issueTypesByTeam).forEach(([team, issues]: [string, any]) => {
      allIssueTypes.push(team, ...(issues || []));
    });

    const exactMatch = allIssueTypes.find(
      (item) => item.trim().toLowerCase() === normalizedCurrent,
    );
    if (exactMatch) return;

    const fallbackMatch = allIssueTypes.find((item) =>
      item.trim().toLowerCase().includes(normalizedCurrent),
    );

    if (fallbackMatch) {
      setFormData((prev) => ({ ...prev, issueType: fallbackMatch }));
    }
  }, [prefilledFromFirewall, issueTypes, formData.issueType]);

  const loadUser = async () => {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
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

    if (anydeskError) {
      setError(t("ticketCreate.anydeskInvalid"));
      setLoading(false);
      return;
    }

    try {
      const problemType = formData.issueType ? "PREDEFINED" : "CUSTOM";

      const payload: any = {
        title: formData.title,
        description: formData.description,
        anydeskNumber: formData.anydeskNumber,
        problemType: problemType,
        issueType: formData.issueType || null,
      };

      await api.post("/tickets", payload);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.error || t("ticketCreate.createFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleIssueTypeChange = (value: string) => {
    setFormData({
      ...formData,
      issueType: value,
      specializationId: "",
    });
  };

  const handleAnydeskChange = (value: string) => {
    const trimmedValue = value.trim();
    const isFirewallPrefill = trimmedValue === "1-9";

    // Keep firewall prefill literal as requested, otherwise allow only 9/10 digits.
    const filteredValue = isFirewallPrefill
      ? trimmedValue
      : trimmedValue.replace(/\D/g, "").slice(0, 10);

    if (
      filteredValue.length > 0 &&
      !isFirewallPrefill &&
      (filteredValue.length < 9 || filteredValue.length > 10)
    ) {
      setAnydeskError(t("ticketCreate.anydeskInvalid"));
    } else {
      setAnydeskError("");
    }

    setFormData({ ...formData, anydeskNumber: filteredValue });
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          {t("ticketCreate.title")}
        </h1>
        {user && user.role !== "USER" && (
          <p className="mb-4 text-sm text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3">
            {t("ticketCreate.engineerHint")}
          </p>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded">
            {error}
          </div>
        )}
        {prefilledFromFirewall && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded">
            Data filled automatically from firewall block
          </div>
        )}

        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-lg p-6 space-y-6 border border-gray-200"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("ticketCreate.titleLabel")}
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              required
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all ${
                prefilledFields.title ? "border-amber-400 bg-amber-50" : "border-gray-300"
              }`}
              placeholder={t("ticketCreate.titlePlaceholder")}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("ticketCreate.description")}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              required
              rows={6}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all ${
                prefilledFields.description
                  ? "border-amber-400 bg-amber-50"
                  : "border-gray-300"
              }`}
              placeholder={t("ticketCreate.descriptionPlaceholder")}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("ticketCreate.anydesk")}
            </label>
            <input
              type="text"
              value={formData.anydeskNumber}
              onChange={(e) => handleAnydeskChange(e.target.value)}
              required
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all ${
                prefilledFields.anydeskNumber
                  ? "border-amber-400 bg-amber-50"
                  : "border-gray-300"
              }`}
              placeholder={t("ticketCreate.anydeskPlaceholder")}
            />
            {anydeskError && (
              <p className="mt-1 text-sm text-red-600">{anydeskError}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              {t("ticketCreate.anydeskHint")}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("ticketCreate.issueType")} <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.issueType}
              onChange={(e) => handleIssueTypeChange(e.target.value)}
              required
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all ${
                prefilledFields.issueType ? "border-amber-400 bg-amber-50" : "border-gray-300"
              }`}
            >
              <option value="">{t("ticketCreate.selectIssueType")}</option>

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
                ? t("ticketCreate.issueTypeHint")
                : t("ticketCreate.issueTypeHintSelect")}
            </p>
          </div>

          <div className="flex space-x-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-indigo-700 hover:to-blue-700 transition-all disabled:opacity-50 shadow-lg hover:shadow-xl"
            >
              {loading ? t("ticketCreate.creating") : t("ticketCreate.submit")}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {t("ticketCreate.cancel")}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
