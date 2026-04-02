import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { getCurrentUser, removeToken, User } from "../utils/auth";
import api from "../utils/api";
import { stopPresence } from "../utils/presence";
import SendSuggestionModal from "./SendSuggestionModal";
import ChatBotModal from "./ChatBotModal";
import { connectTicketMessages, disconnectTicketMessages } from "../utils/ticketMessages";
import LanguageSwitcher from "./LanguageSwitcher";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [previousNotificationCount, setPreviousNotificationCount] = useState(0);
  const [suggestionModalOpen, setSuggestionModalOpen] = useState(false);
  const [unseenSuggestions, setUnseenSuggestions] = useState(0);
  const [openSuperAdminMenu, setOpenSuperAdminMenu] = useState<
    "tickets" | "management" | null
  >(null);
  const superAdminNavRef = useRef<HTMLDivElement>(null);

  // Forced password change flow (for bulk-imported accounts)
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadUnseenSuggestions = async () => {
    if (!user || (user.role !== "SUPER_ADMIN" && user.role !== "SOFTWARE_ENGINEER")) {
      setUnseenSuggestions(0);
      return;
    }
    try {
      const res = await api.get("/suggestions/unseen-count");
      setUnseenSuggestions(res.data.count ?? 0);
    } catch {
      setUnseenSuggestions(0);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadUnseenSuggestions();
    const t = setInterval(loadUnseenSuggestions, 15000);
    return () => clearInterval(t);
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== "SUPER_ADMIN") return;
    const onDoc = (e: MouseEvent) => {
      if (
        superAdminNavRef.current &&
        !superAdminNavRef.current.contains(e.target as Node)
      ) {
        setOpenSuperAdminMenu(null);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [user]);

  useEffect(() => {
    setOpenSuperAdminMenu(null);
  }, [router.pathname]);

  useEffect(() => {
    if (!user) return;
    const onWs = (payload: any) => {
      if (payload?.type === "notification_created") {
        loadNotifications();
        loadUnseenSuggestions();
      }
    };
    connectTicketMessages(onWs);
    return () => disconnectTicketMessages(onWs);
  }, [user]);

  const loadNotifications = async () => {
    try {
      const response = await api.get("/notifications?unread=true");
      const newNotifications = response.data.notifications;

      if (
        newNotifications.length > previousNotificationCount &&
        previousNotificationCount >= 0
      ) {
        playNotificationSound();
      }

      setNotifications(newNotifications);
      setPreviousNotificationCount(newNotifications.length);
    } catch (error) {
      console.error("Failed to load notifications");
    }
  };

  const playNotificationSound = () => {
    try {
      const audioContext = new (
        window.AudioContext || (window as any).webkitAudioContext
      )();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.3,
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.error("Failed to play notification sound:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      await loadNotifications();
    } catch (error) {
      console.error("Failed to mark all as read");
    }
  };

  const handleLogout = () => {
    stopPresence();
    removeToken();
    router.push("/login");
  };

  const getRoleName = (role: string) => t(`roles.${role}`, { defaultValue: role });

  const getNavLinks = () => {
    if (!user) return [];

    const links: { href: string; labelKey: string; defaultLabel?: string; roles: string[] }[] = [
      {
        href: "/dashboard",
        labelKey: "layout.dashboard",
        defaultLabel: "Dashboard",
        roles: [
          "USER",
          "TECHNICIAN",
          "IT_ADMIN",
          "IT_MANAGER",
          "SUPER_ADMIN",
          "SOFTWARE_ENGINEER",
        ],
      },
      {
        href: "/tickets",
        labelKey: "layout.tickets",
        defaultLabel: "Tickets",
        roles: [
          "USER",
          "TECHNICIAN",
          "IT_ADMIN",
          "IT_MANAGER",
          "SUPER_ADMIN",
          "SOFTWARE_ENGINEER",
        ],
      },
      {
        href: "/tickets/create",
        labelKey: "layout.createTicket",
        defaultLabel: "Create Ticket",
        roles: ["USER", "IT_MANAGER", "SUPER_ADMIN"],
      },
      {
        href: "/scheduling-tickets",
        labelKey: "layout.schedulingTickets",
        defaultLabel: "Scheduling Tickets",
        roles: ["TECHNICIAN", "IT_ADMIN"],
      },
      {
        href: "/suggestions",
        labelKey: "layout.suggestionsInbox",
        defaultLabel: "Suggestions Inbox",
        roles: ["SUPER_ADMIN", "SOFTWARE_ENGINEER"],
      },
    ];

    if (
      user.role === "IT_MANAGER" ||
      user.role === "SUPER_ADMIN"
    ) {
      links.push({
        href: "/users",
        labelKey: "layout.users",
        defaultLabel: "Engineers",
        roles: ["IT_MANAGER", "SUPER_ADMIN"],
      });
      links.push({
        href: "/specializations",
        labelKey: "layout.specializations",
        defaultLabel: "Specializations",
        roles: ["IT_MANAGER", "SUPER_ADMIN"],
      });
    }

    return links.filter((link) => link.roles.includes(user.role));
  };

  const superAdminTicketsGroupActive =
    router.pathname === "/dashboard" ||
    router.pathname === "/tickets/create" ||
    router.pathname === "/tickets" ||
    router.pathname.startsWith("/tickets/") ||
    router.pathname === "/scheduling-tickets";

  const superAdminManagementGroupActive =
    router.pathname === "/users" ||
    router.pathname.startsWith("/suggestions") ||
    router.pathname === "/specializations";

  if (!user) return <>{children}</>;

  const handleChangePassword = async (e: any) => {
    e.preventDefault();
    setPwError(null);

    if (pwNew.trim().length < 6) {
      setPwError(t("layout.passwordMin"));
      return;
    }

    if (pwNew !== pwConfirm) {
      setPwError(t("layout.passwordMismatch"));
      return;
    }

    try {
      setPwLoading(true);
      await api.patch("/auth/change-password", { newPassword: pwNew });
      const updated = await getCurrentUser();
      setUser(updated);
      setPwNew("");
      setPwConfirm("");
    } catch (err: any) {
      setPwError(err?.response?.data?.error || "Failed to change password");
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <nav className="bg-white shadow-md border-b border-gray-200">
        <div className=" w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center gap-3 min-h-16 py-2">
            <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-6">
              <div className="flex-shrink-0 flex items-center">
                <div className="flex items-center gap-3">
                  <img
                    src="/assets/logo.png"
                    alt="Global Energy Logo"
                    className="h-9 w-9 object-contain"
                  />
                  <h1 className="text-xl font-bold text-black/80 truncate">
                    {t("app.title")}
                  </h1>
                </div>
              </div>
              {user.role === "SUPER_ADMIN" ? (
                <div
                  ref={superAdminNavRef}
                  className="hidden sm:ms-4 md:ms-6 sm:flex sm:flex-wrap sm:items-end sm:gap-6"
                >
                  <div className="relative flex flex-col gap-0.5">
                    <span className="text-[11px] font-semibold text-gray-500 whitespace-nowrap">
                      {t("layout.superAdminNavTicketsTitle")}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenSuperAdminMenu((v) =>
                          v === "tickets" ? null : "tickets"
                        )
                      }
                      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors ${
                        superAdminTicketsGroupActive
                          ? "bg-indigo-50 text-indigo-700"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                      aria-expanded={openSuperAdminMenu === "tickets"}
                      aria-haspopup="true"
                    >
                      {t("layout.navMenuTickets")}
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 transition-transform ${
                          openSuperAdminMenu === "tickets" ? "rotate-180" : ""
                        }`}
                        aria-hidden
                      />
                    </button>
                    {openSuperAdminMenu === "tickets" && (
                      <div className="absolute start-0 top-full z-40 mt-1 min-w-[12rem] rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                        <Link
                          href="/dashboard"
                          className={`block px-4 py-2 text-sm ${
                            router.pathname === "/dashboard"
                              ? "bg-indigo-50 font-medium text-indigo-700"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                          onClick={() => setOpenSuperAdminMenu(null)}
                        >
                          {t("layout.dashboard")}
                        </Link>
                        <Link
                          href="/tickets/create"
                          className={`block px-4 py-2 text-sm ${
                            router.pathname === "/tickets/create"
                              ? "bg-indigo-50 font-medium text-indigo-700"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                          onClick={() => setOpenSuperAdminMenu(null)}
                        >
                          {t("layout.createTicket")}
                        </Link>
                        <Link
                          href="/tickets"
                          className={`block px-4 py-2 text-sm ${
                            router.pathname === "/tickets" ||
                            (router.pathname.startsWith("/tickets/") &&
                              router.pathname !== "/tickets/create")
                              ? "bg-indigo-50 font-medium text-indigo-700"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                          onClick={() => setOpenSuperAdminMenu(null)}
                        >
                          {t("layout.tickets")}
                        </Link>
                        <Link
                          href="/scheduling-tickets"
                          className={`block px-4 py-2 text-sm ${
                            router.pathname === "/scheduling-tickets"
                              ? "bg-indigo-50 font-medium text-indigo-700"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                          onClick={() => setOpenSuperAdminMenu(null)}
                        >
                          {t("layout.schedulingTickets", {
                            defaultValue: "Scheduling Tickets",
                          })}
                        </Link>
                      </div>
                    )}
                  </div>

                  <div className="relative flex flex-col gap-0.5">
                    <span className="text-[11px] font-semibold text-gray-500 whitespace-nowrap">
                      {t("layout.superAdminNavManagementTitle")}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setOpenSuperAdminMenu((v) =>
                          v === "management" ? null : "management"
                        )
                      }
                      className={`inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors ${
                        superAdminManagementGroupActive
                          ? "bg-indigo-50 text-indigo-700"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                      aria-expanded={openSuperAdminMenu === "management"}
                      aria-haspopup="true"
                    >
                      {t("layout.navMenuManagement")}
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 transition-transform ${
                          openSuperAdminMenu === "management" ? "rotate-180" : ""
                        }`}
                        aria-hidden
                      />
                    </button>
                    {openSuperAdminMenu === "management" && (
                      <div className="absolute start-0 top-full z-40 mt-1 min-w-[12rem] rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                        <Link
                          href="/users"
                          className={`block px-4 py-2 text-sm ${
                            router.pathname === "/users"
                              ? "bg-indigo-50 font-medium text-indigo-700"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                          onClick={() => setOpenSuperAdminMenu(null)}
                        >
                          {t("layout.users")}
                        </Link>
                        <Link
                          href="/suggestions"
                          className={`flex items-center justify-between gap-2 px-4 py-2 text-sm ${
                            router.pathname.startsWith("/suggestions")
                              ? "bg-indigo-50 font-medium text-indigo-700"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                          onClick={() => setOpenSuperAdminMenu(null)}
                        >
                          <span>{t("layout.suggestionsInbox")}</span>
                          {unseenSuggestions > 0 && (
                            <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
                              {unseenSuggestions > 99 ? "99+" : unseenSuggestions}
                            </span>
                          )}
                        </Link>
                        <Link
                          href="/specializations"
                          className={`block px-4 py-2 text-sm ${
                            router.pathname === "/specializations"
                              ? "bg-indigo-50 font-medium text-indigo-700"
                              : "text-gray-700 hover:bg-gray-50"
                          }`}
                          onClick={() => setOpenSuperAdminMenu(null)}
                        >
                          {t("layout.specializations")}
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="hidden sm:ms-4 md:ms-6 sm:flex sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-2">
                  {getNavLinks()
                    .sort((a, b) => {
                      const order = [
                        "/dashboard",
                        "/tickets",
                        "/tickets/create",
                        "/scheduling-tickets",
                        "/suggestions",
                        "/users",
                        "/specializations",
                      ];
                      return order.indexOf(a.href) - order.indexOf(b.href);
                    })
                    .map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={`inline-flex items-center gap-1.5 px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                          router.pathname === link.href ||
                          (link.href === "/suggestions" &&
                            router.pathname.startsWith("/suggestions"))
                            ? "border-indigo-500 text-indigo-600"
                            : "border-transparent text-gray-600 hover:border-gray-300 hover:text-gray-900"
                        }`}
                      >
                        {t(link.labelKey, {
                          defaultValue: link.defaultLabel || link.href,
                        })}
                        {link.href === "/suggestions" &&
                          unseenSuggestions > 0 && (
                            <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
                              {unseenSuggestions > 99
                                ? "99+"
                                : unseenSuggestions}
                            </span>
                          )}
                      </Link>
                    ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 sm:gap-4 flex-wrap sm:flex-nowrap justify-end">
              <LanguageSwitcher />
              {user.role === "USER" && (
                <button
                  type="button"
                  onClick={() => setSuggestionModalOpen(true)}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg hover:from-emerald-700 hover:to-teal-700 shadow-md"
                >
                  {t("layout.sendSuggestion")}
                </button>
              )}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                  {notifications.length > 0 && (
                    <span className="absolute top-1 end-1 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white"></span>
                  )}
                </button>
                {showNotifications && (
                  <div className="absolute end-0 mt-2 w-80 max-w-[min(100vw-2rem,20rem)] bg-white rounded-lg shadow-xl z-50 border border-gray-200">
                    <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-indigo-50 to-blue-50">
                      <h3 className="font-semibold text-gray-900">
                        {t("layout.notifications")}
                      </h3>
                      {notifications.length > 0 && (
                        <button
                          onClick={handleMarkAllAsRead}
                          className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
                        >
                          {t("layout.markAllRead")}
                        </button>
                      )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          {t("layout.noNotifications")}
                        </div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            className="p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                          >
                            <div className="font-medium text-gray-900">
                              {notif.title}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              {notif.message}
                            </div>
                            <div className="text-xs text-gray-400 mt-2">
                              {new Date(notif.createdAt).toLocaleString(
                                i18n.language?.startsWith("ar") ? "ar-SA" : "en-GB"
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-gray-50 max-w-[min(100%,14rem)] sm:max-w-none">
                <span className="text-sm font-medium text-gray-700">
                  {user.name}
                </span>
                <span className="text-xs text-gray-500">
                  ({getRoleName(user.role)})
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-red-600 hover:text-red-800 font-medium transition-colors rounded-lg hover:bg-red-50"
              >
                {t("layout.logout")}
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w- mx-auto py-6 sm:px-6 lg:px-8">{children}</main>

      <SendSuggestionModal
        open={suggestionModalOpen}
        onClose={() => setSuggestionModalOpen(false)}
        onSubmitted={() => loadUnseenSuggestions()}
      />

      <ChatBotModal />

      {user?.mustChangePassword && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              {t("layout.changePasswordTitle")}
            </h3>
            <p className="text-sm text-gray-600 mt-1 mb-4">
              {t("layout.changePasswordHint")}
            </p>

            {pwError && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {pwError}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("layout.newPassword")}
                </label>
                <input
                  type="password"
                  value={pwNew}
                  onChange={(e) => setPwNew(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("layout.confirmPassword")}
                </label>
                <input
                  type="password"
                  value={pwConfirm}
                  onChange={(e) => setPwConfirm(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={pwLoading}
                className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-3 rounded-lg font-medium hover:from-indigo-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
              >
                {pwLoading ? t("layout.saving") : t("layout.savePassword")}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
