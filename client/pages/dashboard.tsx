import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
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
import { capitalizeFirstLetter } from "../utils/text";

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  anydeskNumber: string;
  createdAt: string;
  assignedTo?: { id?: string; name: string } | null;
  createdBy?: { name: string; email?: string } | null;
  specialization?: { name: string };
}

type DashboardFilter = "ALL" | "OPEN" | "RESOLVED" | "CLOSED" | "PENDING";
const DASHBOARD_FILTER_STORAGE_KEY = "dashboard_active_filter";
const ENGINEER_ROLES = new Set(["TECHNICIAN", "IT_ADMIN"]);
const DASHBOARD_PAGE_SIZE = 10;

const isDashboardFilter = (value: string): value is DashboardFilter =>
  ["ALL", "OPEN", "RESOLVED", "CLOSED", "PENDING"].includes(value);

const getDefaultFilterForRole = (role: string | null): DashboardFilter => {
  if (
    role === "USER" ||
    role === "SUPER_ADMIN" ||
    ENGINEER_ROLES.has(role || "")
  ) {
    return "OPEN";
  }
  return "ALL";
};

const getDashboardFilterStorageKey = (userId: string | null) =>
  userId
    ? `${DASHBOARD_FILTER_STORAGE_KEY}_${userId}`
    : DASHBOARD_FILTER_STORAGE_KEY;

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<DashboardFilter>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const reloadTimerRef = useRef<number | null>(null);
  const isEngineerRole = ENGINEER_ROLES.has(userRole || "");
  const canUsePendingFilter = userRole === "SUPER_ADMIN" || isEngineerRole;

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    const loadRole = async () => {
      const currentUser = await getCurrentUser();
      const role = currentUser?.role ?? null;
      setSessionUserId(currentUser?.id ?? null);
      setUserRole(role);
    };
    loadRole();
  }, []);

  useEffect(() => {
    if (userRole === null) return;

    const defaultFilter = getDefaultFilterForRole(userRole);
    if (userRole === "SUPER_ADMIN") {
      setActiveFilter(defaultFilter);
      return;
    }

    const storageKey = getDashboardFilterStorageKey(sessionUserId);
    if (typeof window === "undefined") {
      setActiveFilter(defaultFilter);
      return;
    }

    const storedFilter = window.sessionStorage.getItem(storageKey);
    if (storedFilter && isDashboardFilter(storedFilter)) {
      if (storedFilter === "PENDING" && !canUsePendingFilter) {
        setActiveFilter(defaultFilter);
        return;
      }
      setActiveFilter(storedFilter);
      return;
    }

    setActiveFilter(defaultFilter);
  }, [canUsePendingFilter, sessionUserId, userRole]);

  useEffect(() => {
    if (typeof window === "undefined" || userRole === null) return;
    if (activeFilter === "PENDING" && !canUsePendingFilter) return;
    const storageKey = getDashboardFilterStorageKey(sessionUserId);
    window.sessionStorage.setItem(storageKey, activeFilter);
  }, [activeFilter, canUsePendingFilter, sessionUserId, userRole]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter]);

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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onFocus = () => {
      void loadDashboardRef.current({ silent: true });
    };

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadDashboardRef.current({ silent: true });
      }
    }, 8000);

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  const shouldReloadDashboardFromWs = (payload: any) => {
    if (!payload) return false;
    if (payload.type === "ticket_list_updated") return true;
    if (payload.ticketId) return true;
    // Same channel as notifications: if the user sees a ticket notification in realtime,
    // refresh lists so status/filters match without a full page reload.
    if (payload.type === "notification_created") {
      return true;
    }
    return false;
  };

  // Realtime updates: subscribe only after session is known (same timing as Layout WS).
  useEffect(() => {
    if (!sessionUserId) return;

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
  }, [sessionUserId]);

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

  const dashboardTickets = (dashboard?.tickets || []) as Ticket[];

  const pendingTickets = dashboardTickets.filter((ticket: Ticket) => {
    if (userRole === "SUPER_ADMIN") {
      return (
        ticket.status === "ASSIGNED" ||
        (ticket.status === "OPEN" && !ticket.assignedTo)
      );
    }

    if (!isEngineerRole || ticket.status !== "ASSIGNED") return false;

    if (userRole === "TECHNICIAN") return true;

    return Boolean(sessionUserId && ticket.assignedTo?.id === sessionUserId);
  });

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
        const pendingCard = {
          key: "PENDING" as const,
          labelKey: "dashboard.pending",
          value: pendingTickets.length,
        };
        return canUsePendingFilter
          ? [openCard, pendingCard, resolvedCard, closedCard, allCard]
          : [openCard, resolvedCard, closedCard, allCard];
      })()
    : [];

  const filteredTickets = dashboardTickets.filter(
    (ticket: Ticket) => {
      if (activeFilter === "ALL") return true;
      if (activeFilter === "PENDING") {
        return pendingTickets.some((pendingTicket) => pendingTicket.id === ticket.id);
      }
      // "Open" = active work: OPEN + IN_PROGRESS (not only literal OPEN)
      if (activeFilter === "OPEN") {
        return ticket.status === "OPEN" || ticket.status === "IN_PROGRESS";
      }
      return ticket.status === activeFilter;
    },
  );
  const totalPages = Math.max(
    1,
    Math.ceil(filteredTickets.length / DASHBOARD_PAGE_SIZE),
  );
  const pageStart = (currentPage - 1) * DASHBOARD_PAGE_SIZE;
  const paginatedTickets = filteredTickets.slice(
    pageStart,
    pageStart + DASHBOARD_PAGE_SIZE,
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const canOpenTicketFromDashboard = Boolean(userRole);

  const openTicketDetails = (ticketId: string) => {
    if (!canOpenTicketFromDashboard) return;
    void router.push(`/tickets/${ticketId}`);
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
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          {t("dashboard.title")}
        </h1>

        {dashboard?.stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6 mb-8">
            {summaryCards.map((card) => (
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

        <div className="bg-white rounded-xl shadow-lg border border-gray-200">
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
                {paginatedTickets.map((ticket: Ticket) => (
                  <tr
                    key={ticket.id}
                    onClick={() => openTicketDetails(ticket.id)}
                    onKeyDown={(e) => {
                      if (
                        canOpenTicketFromDashboard &&
                        (e.key === "Enter" || e.key === " ")
                      ) {
                        e.preventDefault();
                        openTicketDetails(ticket.id);
                      }
                    }}
                    role={canOpenTicketFromDashboard ? "button" : undefined}
                    tabIndex={canOpenTicketFromDashboard ? 0 : undefined}
                    className={`transition-colors ${
                      canOpenTicketFromDashboard
                        ? "hover:bg-gray-50 cursor-pointer"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="px-4 sm:px-6 py-4 max-w-xs sm:max-w-md align-top">
                      <div className="text-sm font-medium text-gray-900 break-words">
                        {capitalizeFirstLetter(ticket.title)}
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
            {filteredTickets.length > 0 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
                <p className="text-sm text-gray-600">
                  {t("common.pageIndicator", {
                    defaultValue: "Page {{current}} of {{total}}",
                    current: currentPage,
                    total: totalPages,
                  })}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={currentPage <= 1}
                    className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t("common.previous", { defaultValue: "Previous" })}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
                    disabled={currentPage >= totalPages}
                    className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t("common.next", { defaultValue: "Next" })}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
