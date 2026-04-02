import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Layout from "../components/Layout";
import api from "../utils/api";
import { getCurrentUser } from "../utils/auth";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import {
  connectTicketMessages,
  disconnectTicketMessages,
} from "../utils/ticketMessages";
import { formatTicketStatusLabel as formatStatus } from "../utils/ticketStatusLabel";

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  anydeskNumber: string;
  createdAt: string;
  assignedTo?: { name: string } | null;
  createdBy?: { name: string; email?: string } | null;
  specialization?: { name: string };
}

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<
    "ALL" | "OPEN" | "RESOLVED" | "CLOSED" | "PENDING"
  >("ALL");
  const reloadTimerRef = useRef<number | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    const loadRole = async () => {
      const currentUser = await getCurrentUser();
      const role = currentUser?.role ?? null;
      setUserRole(role);
      if (role === "USER") {
        setActiveFilter("OPEN");
      }
    };
    loadRole();
  }, []);

  const loadDashboard = async (opts?: { silent?: boolean }) => {
    try {
      const silent = opts?.silent ?? false;
      if (!silent) setLoading(true);
      const response = await api.get("/dashboard");
      setDashboard(response.data.dashboard);
    } catch (error) {
      console.error("Failed to load dashboard");
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  };

  const loadDashboardRef = useRef(loadDashboard);
  loadDashboardRef.current = loadDashboard;

  const scheduleDashboardReload = () => {
    if (typeof window === "undefined") return;
    if (reloadTimerRef.current) return;

    reloadTimerRef.current = window.setTimeout(() => {
      reloadTimerRef.current = null;
      void loadDashboardRef.current({ silent: true });
    }, 300);
  };

  const shouldReloadDashboardFromWs = (payload: any) => {
    if (!payload) return false;
    if (payload.type === "ticket_list_updated") return true;
    // Same channel as notifications: if the user sees a ticket notification in realtime,
    // refresh lists so status/filters match without a full page reload.
    if (payload.type === "notification_created" && payload.notification?.ticketId) {
      return true;
    }
    return false;
  };

  // Realtime updates: refresh dashboard when ticket assignment/status changes
  useEffect(() => {
    const onPayload = (payload: any) => {
      if (!shouldReloadDashboardFromWs(payload)) return;
      scheduleDashboardReload();
    };

    connectTicketMessages(onPayload);

    return () => {
      if (reloadTimerRef.current) {
        clearTimeout(reloadTimerRef.current);
        reloadTimerRef.current = null;
      }
      disconnectTicketMessages(onPayload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatTicketStatusLabel = (status: string) => formatStatus(status, t);

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      OPEN: "bg-gray-100 text-gray-800",
      ASSIGNED: "bg-blue-100 text-blue-800",
      IN_PROGRESS: "bg-yellow-100 text-yellow-800",
      RESOLVED: "bg-green-100 text-green-800",
      CLOSED: "bg-gray-100 text-gray-800",
      USER_ACTION_NEEDED: "bg-red-100 text-red-800 border border-red-200",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const trimDescription = (text: string | null | undefined, maxLength = 50) => {
    const value = text?.trim() || "";
    return value.length > maxLength
      ? `${value.substring(0, maxLength)}...`
      : value;
  };

  const summaryCards = dashboard?.stats
    ? (() => {
        const allCard = {
          key: "ALL" as const,
          labelKey: "dashboard.totalTickets",
          value: dashboard.stats.total ?? dashboard.stats.totalTickets ?? 0,
        };
        const openCard = {
          key: "OPEN" as const,
          labelKey: "dashboard.open",
          value:
            (dashboard.stats.open ?? 0) + (dashboard.stats.inProgress ?? 0),
        };
        const resolvedCard = {
          key: "RESOLVED" as const,
          labelKey: "dashboard.resolved",
          value: dashboard.stats.resolved ?? 0,
        };
        const closedCard = {
          key: "CLOSED" as const,
          labelKey: "dashboard.closed",
          value: dashboard.stats.closed ?? 0,
        };
        // USER: Open ? Resolved ? Closed ? All (total) last
        if (userRole === "USER") {
          return [openCard, resolvedCard, closedCard, allCard];
        }
        return [allCard, openCard, resolvedCard, closedCard];
      })()
    : [];

  const filteredTickets = (dashboard?.tickets || []).filter(
    (ticket: Ticket) => {
      if (activeFilter === "ALL") return true;
      if (activeFilter === "PENDING") {
        // "pending" should include only:
        // - assigned: status = ASSIGNED
        // - unassigned: status = OPEN AND no technician assigned yet (assignedTo is null)
        return (
          ticket.status === "ASSIGNED" ||
          (ticket.status === "OPEN" && !ticket.assignedTo)
        );
      }
      // "Open" = active work: OPEN + IN_PROGRESS (not only literal OPEN)
      if (activeFilter === "OPEN") {
        return ticket.status === "OPEN" || ticket.status === "IN_PROGRESS";
      }
      return ticket.status === activeFilter;
    },
  );

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
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          {t("dashboard.title")}
        </h1>

        {dashboard?.stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[
              ...summaryCards,
              ...(userRole === "SUPER_ADMIN"
                ? [
                    {
                      key: "PENDING",
                      labelKey: "dashboard.pending",
                      value: (dashboard?.tickets || []).filter(
                        (t: Ticket) =>
                          t.status === "ASSIGNED" ||
                          (t.status === "OPEN" && !t.assignedTo),
                      ).length,
                    },
                  ]
                : []),
            ].map((card) => (
              <button
                key={card.key}
                type="button"
                onClick={() => setActiveFilter(card.key as any)}
                className={`text-left rounded-xl shadow-lg p-6 border transition-all ${
                  activeFilter === card.key
                    ? "border-indigo-500 ring-2 ring-indigo-200 bg-indigo-50"
                    : "bg-white border-gray-200 hover:shadow-xl"
                }`}
              >
                <div className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                  {t((card as any).labelKey)}
                </div>
                <div className="text-3xl font-bold text-gray-900 mt-2">
                  {card.value}
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="bg-white  rounded-xl shadow-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-blue-50">
            <h2 className="text-xl font-semibold text-gray-900">
              {t("dashboard.ticketsSection")}
            </h2>
          </div>
          <div className="overflow-x-auto overscroll-x-contain">
            <table className="min-w-full w-full table-auto divide-y divide-gray-200 text-start">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 sm:px-6 py-3 text-start text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    {t("tickets.colTitle")}
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-start text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    {t("tickets.colStatus")}
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-start text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    {t("tickets.colAnydesk")}
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-start text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    {t("tickets.colCustomer")}
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-start text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    {t("tickets.colEngineer")}
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-start text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                    {t("tickets.colCreated")}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTickets.map((ticket: Ticket) => (
                  <tr
                    key={ticket.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 sm:px-6 py-4 max-w-xs sm:max-w-md align-top ">
                      <div className="text-sm font-medium text-gray-900 break-words">
                        {ticket.title}
                      </div>
                      <div className="text-sm text-gray-500 break-words line-clamp-2">
                        {trimDescription(ticket.description)}
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap align-top">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(ticket.status)}`}
                      >
                        {formatTicketStatusLabel(ticket.status)}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap align-top">
                      <span className="text-sm font-medium text-indigo-600">
                        {ticket.anydeskNumber || "N/A"}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 align-top">
                      <div className="text-sm font-medium text-gray-900">
                        {ticket.createdBy?.name || "N/A"}
                      </div>
                      {ticket.createdBy?.email && (
                        <div className="text-xs text-gray-500">
                          {ticket.createdBy.email}
                        </div>
                      )}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 align-top">
                      {ticket.assignedTo?.name ||
                        (ticket.specialization?.name
                          ? `${t("dashboard.teamPrefix")}: ${ticket.specialization.name}`
                          : t("dashboard.unassigned"))}
                    </td>
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 align-top">
                      {ticket.createdAt &&
                        format(new Date(ticket.createdAt), "MMM dd, yyyy", {
                          locale: i18n.language?.startsWith("ar")
                            ? ar
                            : undefined,
                        })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredTickets.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                {t("dashboard.noTickets", {
                  filter:
                    activeFilter === "ALL"
                      ? t("dashboard.noTicketsGeneric")
                      : activeFilter,
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
