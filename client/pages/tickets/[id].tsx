import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useTranslation } from "react-i18next";
import Layout from "../../components/Layout";
import api from "../../utils/api";
import { getCurrentUser } from "../../utils/auth";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import {
  connectTicketMessages,
  disconnectTicketMessages,
} from "../../utils/ticketMessages";
import { formatTicketStatusLabel } from "../../utils/ticketStatusLabel";
import { useClientMounted } from "../../hooks/useClientMounted";

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  anydeskNumber: string;
  issueType?: string;
  problemType: string;
  slaDeadline: string;
  slaStatus: string;
  assignedTo?: { id: string; name: string };
  createdBy?: { id: string; name: string };
  specialization?: { name: string };
}

interface TicketMessage {
  id: string;
  ticketId: string;
  authorId: string;
  toUserId: string;
  parentId: string | null;
  type: "ACTION_REQUEST" | "USER_REPLY" | "RESOLVED_COMMENT";
  body: string;
  createdAt: string;
  author: { id: string; name: string; email: string };
  toUser?: { id: string; name: string; email: string };
}

export default function TicketDetail() {
  const { t, i18n } = useTranslation();
  const clientMounted = useClientMounted();
  const router = useRouter();
  const { id } = router.query;
  const ticketId = Array.isArray(id) ? id[0] : id;
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState<string | null>(null);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [specializations, setSpecializations] = useState<any[]>([]);
  const [messages, setMessages] = useState<TicketMessage[]>([]);

  const [showActionNeededForm, setShowActionNeededForm] = useState(false);
  const [actionNeededComment, setActionNeededComment] = useState("");
  const [actionNeededLoading, setActionNeededLoading] = useState(false);

  const [userReply, setUserReply] = useState("");
  const [userReplyLoading, setUserReplyLoading] = useState(false);

  const [resolvedComment, setResolvedComment] = useState("");
  const [resolvedCommentLoading, setResolvedCommentLoading] = useState(false);

  const dateLocale = i18n.language?.startsWith("ar") ? ar : undefined;
  const localeStr = i18n.language?.startsWith("ar") ? "ar-SA" : "en-GB";

  useEffect(() => {
    if (id) {
      loadTicket();
      loadUser();
      loadTechnicians();
      loadSpecializations();
      loadMessages();
    }
  }, [id]);

  useEffect(() => {
    if (!ticketId) return;

    const onPayload = (payload: any) => {
      if (!payload || payload.type !== "ticket_message_created") return;
      if (payload.ticketId !== ticketId) return;

      const incoming = payload.message as TicketMessage;

      setMessages((prev) => {
        if (prev.some((m) => m.id === incoming.id)) return prev;
        const merged = [...prev, incoming];
        merged.sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        return merged;
      });

      if (incoming.type === "ACTION_REQUEST") {
        setTicket((prev) =>
          prev ? { ...prev, status: "USER_ACTION_NEEDED" } : prev
        );
      }
      if (incoming.type === "RESOLVED_COMMENT") {
        setResolvedComment("");
      }
    };

    connectTicketMessages(onPayload);

    return () => {
      disconnectTicketMessages(onPayload);
    };
  }, [ticketId]);

  const loadTicket = async () => {
    try {
      const response = await api.get(`/tickets/${id}`);
      setTicket(response.data.ticket);
    } catch (error) {
      console.error("Failed to load ticket");
    } finally {
      setLoading(false);
    }
  };

  const loadUser = async () => {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
  };

  const loadTechnicians = async () => {
    try {
      const response = await api.get("/users/technicians");
      setTechnicians(response.data.technicians || []);
    } catch (error) {
      console.error("Failed to load engineers:", error);
      setTechnicians([]);
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

  const loadMessages = async () => {
    try {
      const response = await api.get(`/tickets/${id}/messages`);
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error("Failed to load ticket messages");
      setMessages([]);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    setStatusLoading(newStatus);
    try {
      await api.patch(`/tickets/${id}/status`, { status: newStatus });
      await loadTicket();
    } catch (error) {
      console.error("Failed to update status");
    } finally {
      setStatusLoading(null);
    }
  };

  const handleSendActionNeeded = async () => {
    if (!actionNeededComment.trim()) return;
    setActionNeededLoading(true);
    try {
      await api.post(`/tickets/${id}/action-needed`, {
        comment: actionNeededComment,
      });
      setActionNeededComment("");
      setShowActionNeededForm(false);
      await loadTicket();
      await loadMessages();
    } catch (error) {
      console.error("Failed to send action-needed request", error);
    } finally {
      setActionNeededLoading(false);
    }
  };

  const latestIncomingActionRequestForUser = (() => {
    if (!user) return null;
    const myRequests = messages
      .filter((m) => m.type === "ACTION_REQUEST")
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    return myRequests[0] || null;
  })();

  const latestReplyForRequestByUser = (() => {
    if (!latestIncomingActionRequestForUser || !user) return null;
    return (
      messages.find(
        (m) =>
          m.type === "USER_REPLY" &&
          m.parentId === latestIncomingActionRequestForUser.id &&
          m.authorId === user.id
      ) || null
    );
  })();

  const handleSendResolvedComment = async () => {
    if (!resolvedComment.trim() || !ticketId) return;
    setResolvedCommentLoading(true);
    try {
      await api.post(`/tickets/${ticketId}/resolved-comments`, {
        body: resolvedComment.trim(),
      });
      setResolvedComment("");
      await loadMessages();
    } catch (error) {
      console.error("Failed to send resolved-ticket comment", error);
    } finally {
      setResolvedCommentLoading(false);
    }
  };

  const handleConfirmUserReply = async () => {
    if (!latestIncomingActionRequestForUser) return;
    if (!userReply.trim()) return;
    setUserReplyLoading(true);
    try {
      await api.post(`/tickets/${id}/replies`, {
        requestMessageId: latestIncomingActionRequestForUser.id,
        reply: userReply,
      });
      setUserReply("");
      await loadMessages();
    } catch (error) {
      console.error("Failed to confirm reply", error);
    } finally {
      setUserReplyLoading(false);
    }
  };

  const handleAssign = async (specializationId: string) => {
    try {
      await api.post(`/tickets/${id}/assign`, { specializationId });
      loadTicket();
    } catch (error) {
      console.error("Failed to assign ticket");
    }
  };

  const handleReassign = async (
    specializationId: string,
    technicianId?: string
  ) => {
    try {
      if (ticket?.problemType === "CUSTOM") {
        await api.post(`/tickets/${id}/reassign`, { specializationId });
      } else {
        if (!technicianId) {
          console.error("Engineer ID required for non-custom tickets");
          return;
        }
        await api.post(`/tickets/${id}/reassign`, { technicianId });
      }
      loadTicket();
    } catch (error) {
      console.error("Failed to reassign ticket");
    }
  };

  const formatStatusLabel = (s: string) => formatTicketStatusLabel(s, t);

  const formatProblemTypeLabel = (p: string) =>
    t(`ticketDetail.problemTypes.${p}`, { defaultValue: p });

  const formatSlaLabel = (s: string) =>
    t(`ticketDetail.sla.${s}`, { defaultValue: s });

  const messageTypeLabel = (type: TicketMessage["type"]) => {
    if (type === "ACTION_REQUEST") return t("ticketDetail.msgActionRequest");
    if (type === "RESOLVED_COMMENT")
      return t("ticketDetail.msgFollowUpResolved");
    return t("ticketDetail.msgUserReply");
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <span className="sr-only">
            {clientMounted ? t("common.loading") : "Loading..."}
          </span>
        </div>
      </Layout>
    );
  }

  if (!ticket) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500">{t("ticketDetail.notFound")}</p>
        </div>
      </Layout>
    );
  }

  const canUpdateStatus =
    (user?.role === "TECHNICIAN" && ticket.assignedTo?.id === user.id) ||
    (user?.role === "IT_ADMIN" && ticket.specialization?.name === "IT Admin");
  const canAssign = user?.role === "SUPER_ADMIN" && ticket.problemType === "CUSTOM";
  const canReassign = user?.role === "SUPER_ADMIN";

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-indigo-600 hover:text-indigo-800 mb-4 font-medium transition-colors"
          >
            {t("ticketDetail.back")}
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{ticket.title}</h1>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 space-y-6 border border-gray-200 text-start">
          <div>
            <h2 className="text-lg font-semibold mb-2 text-gray-900">
              {t("ticketDetail.description")}
            </h2>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
              {ticket.description}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 mb-1">
                {t("ticketDetail.status")}
              </h3>
              <p
                className={`text-lg font-semibold ${
                  ticket.status === "USER_ACTION_NEEDED"
                    ? "text-red-600"
                    : "text-gray-900"
                }`}
              >
                {formatStatusLabel(ticket.status)}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 mb-1">
                {t("ticketDetail.anydesk")}
              </h3>
              <p className="text-lg font-semibold text-indigo-600" dir="ltr">
                {ticket.anydeskNumber || t("ticketDetail.na")}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 mb-1">
                {t("ticketDetail.problemType")}
              </h3>
              <p className="text-lg font-semibold text-gray-900">
                {formatProblemTypeLabel(ticket.problemType)}
              </p>
            </div>
            {ticket.issueType && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500 mb-1">
                  {t("ticketDetail.issueType")}
                </h3>
                <p className="text-lg font-semibold text-indigo-600">
                  {ticket.issueType}
                </p>
              </div>
            )}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 mb-1">
                {t("ticketDetail.specialization")}
              </h3>
              <p className="text-lg font-semibold text-gray-900">
                {ticket.specialization?.name || t("ticketDetail.notSpecified")}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 mb-1">
                {t("ticketDetail.assignedEngineer")}
              </h3>
              <p className="text-lg font-semibold text-gray-900">
                {ticket.assignedTo?.name || t("ticketDetail.unassigned")}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg sm:col-span-2">
              <h3 className="text-sm font-medium text-gray-500 mb-1">
                {t("ticketDetail.slaStatus")}
              </h3>
              <p
                className={`text-lg font-semibold ${
                  ticket.slaStatus === "OVERDUE" ? "text-red-600" : "text-gray-900"
                }`}
              >
                {formatSlaLabel(ticket.slaStatus)}
              </p>
              {ticket.slaDeadline && (
                <p className="text-sm text-gray-500 mt-1" dir="ltr">
                  {format(
                    new Date(ticket.slaDeadline),
                    "MMM dd, yyyy HH:mm",
                    { locale: dateLocale }
                  )}
                </p>
              )}
            </div>
          </div>

          {canUpdateStatus && (
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">
                {t("ticketDetail.updateStatus")}
              </h3>
              <div className="flex flex-wrap gap-2">
                {["IN_PROGRESS", "RESOLVED", "CLOSED"].map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => handleStatusChange(status)}
                    disabled={statusLoading !== null}
                    className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:from-indigo-700 hover:to-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {statusLoading === status ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>{t("ticketDetail.updating")}</span>
                      </>
                    ) : (
                      formatStatusLabel(status)
                    )}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowActionNeededForm(true)}
                  disabled={statusLoading !== null || actionNeededLoading}
                  className="px-4 py-2 bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white rounded-lg hover:from-fuchsia-700 hover:to-pink-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {actionNeededLoading && showActionNeededForm ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>{t("ticketDetail.sending")}</span>
                    </>
                  ) : (
                    t("ticketDetail.userActionNeededShort")
                  )}
                </button>
              </div>

              {showActionNeededForm && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("ticketDetail.messageToUser")}
                  </label>
                  <textarea
                    value={actionNeededComment}
                    onChange={(e) => setActionNeededComment(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition-all"
                    placeholder={t("ticketDetail.messageToUserPlaceholder")}
                  />
                  <div className="flex flex-wrap items-center gap-3 mt-3">
                    <button
                      type="button"
                      onClick={handleSendActionNeeded}
                      disabled={!actionNeededComment.trim() || actionNeededLoading}
                      className="px-4 py-2 bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white rounded-lg hover:from-fuchsia-700 hover:to-pink-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionNeededLoading
                        ? t("ticketDetail.sending")
                        : t("ticketDetail.sendRequest")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowActionNeededForm(false);
                        setActionNeededComment("");
                      }}
                      disabled={actionNeededLoading}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t("ticketDetail.cancel")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {canAssign && (
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">
                {t("ticketDetail.assignTeam")}
              </h3>
              {specializations.length === 0 ? (
                <p className="text-gray-500">
                  {t("ticketDetail.noSpecializations")}
                </p>
              ) : (
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAssign(e.target.value);
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  defaultValue=""
                >
                  <option value="">{t("ticketDetail.selectTeam")}</option>
                  {specializations.map((spec) => (
                    <option key={spec.id} value={spec.id}>
                      {spec.name}{" "}
                      {spec.description ? `- ${spec.description}` : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {canReassign && (
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">
                {ticket.problemType === "CUSTOM"
                  ? t("ticketDetail.reassignTeam")
                  : t("ticketDetail.reassignTicket")}
              </h3>
              {ticket.problemType === "CUSTOM" ? (
                specializations.length === 0 ? (
                  <p className="text-gray-500">
                    {t("ticketDetail.noSpecializations")}
                  </p>
                ) : (
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleReassign(e.target.value);
                      }
                    }}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    defaultValue=""
                  >
                    <option value="">{t("ticketDetail.selectTeam")}</option>
                    {specializations.map((spec) => (
                      <option key={spec.id} value={spec.id}>
                        {spec.name}{" "}
                        {spec.description ? `- ${spec.description}` : ""}
                      </option>
                    ))}
                  </select>
                )
              ) : technicians.length === 0 ? (
                <p className="text-gray-500">
                  {t("ticketDetail.noEngineersAvailable")}
                </p>
              ) : (
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleReassign("", e.target.value);
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  defaultValue=""
                >
                  <option value="">{t("ticketDetail.selectEngineer")}</option>
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.name} -{" "}
                      {tech.specialization?.name ||
                        t("ticketDetail.noSpecInOption")}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">
              {t("ticketDetail.conversation")}
            </h3>

            {messages.length === 0 ? (
              <p className="text-gray-500">{t("ticketDetail.noMessages")}</p>
            ) : (
              <div className="space-y-3">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className="bg-gray-50 border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          {messageTypeLabel(m.type)} —{" "}
                          {m.author?.name || t("ticketDetail.unknown")}
                        </div>
                        <div className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
                          {m.body}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                        {m.createdAt
                          ? new Date(m.createdAt).toLocaleString(localeStr)
                          : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {user?.role === "USER" &&
              ticket.createdBy?.id === user?.id &&
              ticket.status === "RESOLVED" &&
              ticket.assignedTo?.id && (
                <div className="mt-6 border-t border-gray-200 pt-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-2">
                    {t("ticketDetail.addCommentResolved")}
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">
                    {t("ticketDetail.engineerNotifiedRealtime")}
                  </p>
                  <textarea
                    value={resolvedComment}
                    onChange={(e) => setResolvedComment(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    placeholder={t("ticketDetail.resolvedCommentPlaceholder")}
                  />
                  <div className="flex items-center gap-3 mt-3">
                    <button
                      type="button"
                      onClick={handleSendResolvedComment}
                      disabled={!resolvedComment.trim() || resolvedCommentLoading}
                      className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {resolvedCommentLoading
                        ? t("ticketDetail.sending")
                        : t("ticketDetail.sendComment")}
                    </button>
                  </div>
                </div>
              )}

            {user?.role === "USER" &&
              latestIncomingActionRequestForUser &&
              !latestReplyForRequestByUser && (
                <div className="mt-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-2">
                    {t("ticketDetail.confirmRequest")}
                  </h4>
                  <textarea
                    value={userReply}
                    onChange={(e) => setUserReply(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    placeholder={t("ticketDetail.confirmPlaceholder")}
                  />
                  <div className="flex items-center gap-3 mt-3">
                    <button
                      type="button"
                      onClick={handleConfirmUserReply}
                      disabled={!userReply.trim() || userReplyLoading}
                      className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:from-indigo-700 hover:to-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {userReplyLoading
                        ? t("ticketDetail.confirming")
                        : t("ticketDetail.confirm")}
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
