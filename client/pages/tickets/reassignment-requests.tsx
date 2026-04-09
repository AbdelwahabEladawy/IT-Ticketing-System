import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import Layout from "../../components/Layout";
import api from "../../utils/api";
import { getCurrentUser } from "../../utils/auth";
import { formatTicketStatusLabel } from "../../utils/ticketStatusLabel";
import { capitalizeFirstLetter } from "../../utils/text";

type ReassignmentRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "AUTO_APPROVED";

type ReassignmentStatusFilter = ReassignmentRequestStatus | "ALL";

interface ReassignmentRequestItem {
  id: string;
  ticketId: string;
  status: ReassignmentRequestStatus;
  reason?: string | null;
  rejectionReason?: string | null;
  autoApproveAt: string;
  createdAt: string;
  decidedAt?: string | null;
  requestedBy?: { id: string; name: string; email: string; role: string };
  fromEngineer?: { id: string; name: string; email: string; role: string } | null;
  toEngineer?: { id: string; name: string; email: string; role: string };
  decidedBy?: { id: string; name: string; email: string; role: string } | null;
  ticket?: {
    id: string;
    title: string;
    status: string;
    createdAt: string;
    createdBy?: { id: string; name: string; email: string } | null;
    assignedTo?: { id: string; name: string; email: string } | null;
    specialization?: { id: string; name: string } | null;
  };
}

const STATUS_FILTERS: ReassignmentStatusFilter[] = [
  "PENDING",
  "APPROVED",
  "AUTO_APPROVED",
  "REJECTED",
  "ALL",
];

export default function ReassignmentRequestsPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [accessLoading, setAccessLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [requests, setRequests] = useState<ReassignmentRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] =
    useState<ReassignmentStatusFilter>("PENDING");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});
  const [nowTs, setNowTs] = useState(Date.now());

  const localeStr = i18n.language?.startsWith("ar") ? "ar-SA" : "en-GB";

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await getCurrentUser();
      const canAccess = currentUser?.role === "SUPER_ADMIN";
      setAllowed(canAccess);
      setAccessLoading(false);
      if (!canAccess) {
        void router.replace("/dashboard");
      }
    };
    void loadUser();
  }, [router]);

  const loadRequests = async (opts?: { silent?: boolean }) => {
    if (!allowed) return;
    const silent = opts?.silent ?? false;
    try {
      if (!silent) setLoading(true);
      setError(null);
      const response = await api.get("/tickets/reassignment-requests", {
        params: { status: activeStatus },
      });
      setRequests(response.data.requests || []);
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          t("common.error", { defaultValue: "Something went wrong" }),
      );
      setRequests([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (!allowed) return;
    void loadRequests();
  }, [allowed, activeStatus]);

  useEffect(() => {
    if (!allowed) return;
    const intervalId = window.setInterval(() => {
      void loadRequests({ silent: true });
    }, 10000);
    return () => {
      clearInterval(intervalId);
    };
  }, [allowed, activeStatus]);

  useEffect(() => {
    const hasPending = requests.some((r) => r.status === "PENDING");
    if (!hasPending) return;
    const timer = window.setInterval(() => {
      setNowTs(Date.now());
    }, 1000);
    return () => {
      clearInterval(timer);
    };
  }, [requests]);

  const pendingCount = useMemo(
    () => requests.filter((req) => req.status === "PENDING").length,
    [requests],
  );

  const formatReassignmentStatus = (status: ReassignmentRequestStatus) => {
    const labels: Record<ReassignmentRequestStatus, string> = {
      PENDING: t("ticketDetail.reassignRequest.pending", {
        defaultValue: "Pending",
      }),
      APPROVED: t("ticketDetail.reassignRequest.approved", {
        defaultValue: "Approved",
      }),
      REJECTED: t("ticketDetail.reassignRequest.rejected", {
        defaultValue: "Rejected",
      }),
      AUTO_APPROVED: t("ticketDetail.reassignRequest.autoApproved", {
        defaultValue: "Auto-Approved",
      }),
    };
    return labels[status];
  };

  const getStatusBadgeClass = (status: ReassignmentRequestStatus) => {
    const classes: Record<ReassignmentRequestStatus, string> = {
      PENDING: "bg-amber-100 text-amber-800",
      APPROVED: "bg-green-100 text-green-800",
      REJECTED: "bg-rose-100 text-rose-800",
      AUTO_APPROVED: "bg-blue-100 text-blue-800",
    };
    return classes[status];
  };

  const formatRemainingTimer = (autoApproveAt: string) => {
    const remainingMs = new Date(autoApproveAt).getTime() - nowTs;
    if (remainingMs <= 0) return "00:00";
    const totalSeconds = Math.floor(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  const handleApproveAndReassign = async (requestId: string) => {
    setActionLoadingId(requestId);
    try {
      await api.post(`/tickets/reassignment-requests/${requestId}/approve`);
      await loadRequests({ silent: true });
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          t("common.error", { defaultValue: "Something went wrong" }),
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setActionLoadingId(requestId);
    try {
      await api.post(`/tickets/reassignment-requests/${requestId}/reject`, {
        reason: rejectReasons[requestId]?.trim() || undefined,
      });
      setRejectReasons((prev) => ({ ...prev, [requestId]: "" }));
      await loadRequests({ silent: true });
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          t("common.error", { defaultValue: "Something went wrong" }),
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const getFilterLabel = (status: ReassignmentStatusFilter) => {
    if (status === "ALL") {
      return t("reassignRequests.filters.all", { defaultValue: "All" });
    }
    return formatReassignmentStatus(status);
  };

  if (accessLoading || (allowed && loading)) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
        </div>
      </Layout>
    );
  }

  if (!allowed) {
    return (
      <Layout>
        <div className="px-4 py-6 text-center text-gray-500">
          {t("suggestions.accessDenied", {
            defaultValue: "You do not have access to this page.",
          })}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {t("reassignRequests.title", {
                defaultValue: "Reassignment Requests",
              })}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {t("reassignRequests.subtitle", {
                defaultValue:
                  "Review engineer requests and decide reassignment from one place.",
              })}
            </p>
          </div>
          <div className="text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {t("reassignRequests.pendingCount", {
              defaultValue: "Pending requests: {{count}}",
              count: pendingCount,
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {STATUS_FILTERS.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setActiveStatus(status)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeStatus === status
                  ? "bg-indigo-600 text-white"
                  : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {getFilterLabel(status)}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">
            {error}
          </div>
        )}

        {requests.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-gray-500">
            {t("reassignRequests.none", {
              defaultValue: "No reassignment requests found.",
            })}
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => {
              const isPending = request.status === "PENDING";
              const ticketId = request.ticket?.id || request.ticketId;
              const isActionLoading = actionLoadingId === request.id;

              return (
                <div
                  key={request.id}
                  className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <button
                        type="button"
                        onClick={() => void router.push(`/tickets/${ticketId}`)}
                        className="text-lg font-semibold text-indigo-700 hover:text-indigo-900 transition-colors text-start"
                      >
                        {request.ticket?.title
                          ? capitalizeFirstLetter(request.ticket.title)
                          : t("ticketDetail.notFound")}
                      </button>
                      <div className="text-xs text-gray-500 mt-1">
                        {t("reassignRequests.ticketStatus", {
                          defaultValue: "Ticket status: {{status}}",
                          status: formatTicketStatusLabel(
                            request.ticket?.status || "OPEN",
                            t,
                          ),
                        })}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(request.status)}`}
                    >
                      {formatReassignmentStatus(request.status)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 text-sm text-gray-700">
                    <div>
                      <span className="font-medium">
                        {t("reassignRequests.requestedBy", {
                          defaultValue: "Requested by",
                        })}
                        :
                      </span>{" "}
                      {request.requestedBy?.name || t("ticketDetail.unknown")}
                    </div>
                    <div>
                      <span className="font-medium">
                        {t("reassignRequests.route", {
                          defaultValue: "Transfer route",
                        })}
                        :
                      </span>{" "}
                      {(request.fromEngineer?.name ||
                        t("reassignRequests.unassigned", {
                          defaultValue: "Unassigned",
                        })) +
                        " -> " +
                        (request.toEngineer?.name || t("ticketDetail.unknown"))}
                    </div>
                    <div>
                      <span className="font-medium">
                        {t("reassignRequests.createdAt", {
                          defaultValue: "Created at",
                        })}
                        :
                      </span>{" "}
                      {new Date(request.createdAt).toLocaleString(localeStr)}
                    </div>
                    {request.decidedAt && (
                      <div>
                        <span className="font-medium">
                          {t("reassignRequests.decidedAt", {
                            defaultValue: "Decided at",
                          })}
                          :
                        </span>{" "}
                        {new Date(request.decidedAt).toLocaleString(localeStr)}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 rounded-lg bg-gray-50 border border-gray-200 p-3">
                    <div className="text-xs font-semibold uppercase text-gray-500 mb-1">
                      {t("reassignRequests.reason", {
                        defaultValue: "Engineer reason",
                      })}
                    </div>
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">
                      {request.reason?.trim() ||
                        t("reassignRequests.noReason", {
                          defaultValue: "No reason provided.",
                        })}
                    </p>
                  </div>

                  {request.rejectionReason && (
                    <div className="mt-3 rounded-lg bg-rose-50 border border-rose-200 p-3">
                      <div className="text-xs font-semibold uppercase text-rose-600 mb-1">
                        {t("reassignRequests.rejectionReason", {
                          defaultValue: "Rejection reason",
                        })}
                      </div>
                      <p className="text-sm text-rose-700 whitespace-pre-wrap">
                        {request.rejectionReason}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void router.push(`/tickets/${ticketId}`)}
                      className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm"
                    >
                      {t("reassignRequests.openTicket", {
                        defaultValue: "Open Ticket",
                      })}
                    </button>

                    {isPending && (
                      <>
                        <span className="text-xs text-amber-700 font-medium">
                          {t("ticketDetail.reassignRequest.timeLeft", {
                            defaultValue: "Auto-approval in",
                          })}{" "}
                          {formatRemainingTimer(request.autoApproveAt)}
                        </span>
                        <button
                          type="button"
                          onClick={() => void handleApproveAndReassign(request.id)}
                          disabled={isActionLoading}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {t("reassignRequests.approveReassign", {
                            defaultValue: "Approve & Reassign",
                          })}
                        </button>
                        <input
                          type="text"
                          value={rejectReasons[request.id] || ""}
                          onChange={(e) =>
                            setRejectReasons((prev) => ({
                              ...prev,
                              [request.id]: e.target.value,
                            }))
                          }
                          className="min-w-[16rem] flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                          placeholder={t(
                            "ticketDetail.reassignRequest.rejectReasonPlaceholder",
                            {
                              defaultValue: "Provide reason if you reject this request",
                            },
                          )}
                        />
                        <button
                          type="button"
                          onClick={() => void handleReject(request.id)}
                          disabled={isActionLoading}
                          className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-sm hover:bg-rose-700 disabled:opacity-50"
                        >
                          {t("ticketDetail.reassignRequest.reject", {
                            defaultValue: "Reject",
                          })}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
