import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import api from "../../utils/api";
import { getCurrentUser } from "../../utils/auth";
import { format } from "date-fns";
import {
  connectTicketMessages,
  disconnectTicketMessages,
} from "../../utils/ticketMessages";

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
  type: 'ACTION_REQUEST' | 'USER_REPLY';
  body: string;
  createdAt: string;
  author: { id: string; name: string; email: string };
  toUser?: { id: string; name: string; email: string };
}

export default function TicketDetail() {
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

  // Engineer -> User action request
  const [showActionNeededForm, setShowActionNeededForm] = useState(false);
  const [actionNeededComment, setActionNeededComment] = useState('');
  const [actionNeededLoading, setActionNeededLoading] = useState(false);

  // User -> Engineer reply
  const [userReply, setUserReply] = useState('');
  const [userReplyLoading, setUserReplyLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadTicket();
      loadUser();
      loadTechnicians();
      loadSpecializations();
      loadMessages();
    }
  }, [id]);

  // Realtime updates for ticket messages
  useEffect(() => {
    if (!ticketId) return;

    connectTicketMessages((payload) => {
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

      // Keep the ticket status display in sync when the action request is created
      if (incoming.type === "ACTION_REQUEST") {
        setTicket((prev) =>
          prev ? { ...prev, status: "USER_ACTION_NEEDED" } : prev
        );
      }
    });

    return () => {
      disconnectTicketMessages();
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
      console.log("Technicians loaded:", response.data.technicians);
      setTechnicians(response.data.technicians || []);
    } catch (error) {
      console.error("Failed to load technicians:", error);
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
      await api.post(`/tickets/${id}/action-needed`, { comment: actionNeededComment });
      setActionNeededComment('');
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
    // For USER tickets we rely on ticket access control; the action request we must confirm
    // is the latest ACTION_REQUEST message in the conversation thread.
    const myRequests = messages
      .filter((m) => m.type === "ACTION_REQUEST")
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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

  const handleConfirmUserReply = async () => {
    if (!latestIncomingActionRequestForUser) return;
    if (!userReply.trim()) return;
    setUserReplyLoading(true);
    try {
      await api.post(`/tickets/${id}/replies`, {
        requestMessageId: latestIncomingActionRequestForUser.id,
        reply: userReply
      });
      setUserReply('');
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
    technicianId?: string,
  ) => {
    try {
      // For CUSTOM tickets: use specializationId only
      // For other tickets: use technicianId
      if (ticket?.problemType === "CUSTOM") {
        await api.post(`/tickets/${id}/reassign`, { specializationId });
      } else {
        if (!technicianId) {
          console.error("Technician ID required for non-custom tickets");
          return;
        }
        await api.post(`/tickets/${id}/reassign`, { technicianId });
      }
      loadTicket();
    } catch (error) {
      console.error("Failed to reassign ticket");
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

  if (!ticket) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500">Ticket not found</p>
        </div>
      </Layout>
    );
  }

  // Technician can update tickets assigned to them
  // IT Admin can update tickets assigned to IT Admin team
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
            onClick={() => router.back()}
            className="text-indigo-600 hover:text-indigo-800 mb-4 font-medium transition-colors"
          >
            ← Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">{ticket.title}</h1>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6 space-y-6 border border-gray-200">
          <div>
            <h2 className="text-lg font-semibold mb-2 text-gray-900">
              Description
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {ticket.description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Status</h3>
              <p className="text-lg font-semibold text-gray-900">
                {ticket.status}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 mb-1">
                Anydesk Number
              </h3>
              <p className="text-lg font-semibold text-indigo-600">
                {ticket.anydeskNumber || "N/A"}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 mb-1">
                Problem Type
              </h3>
              <p className="text-lg font-semibold text-gray-900">
                {ticket.problemType}
              </p>
            </div>
            {ticket.issueType && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500 mb-1">
                  Issue Type
                </h3>
                <p className="text-lg font-semibold text-indigo-600">
                  {ticket.issueType}
                </p>
              </div>
            )}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 mb-1">
                Specialization
              </h3>
              <p className="text-lg font-semibold text-gray-900">
                {ticket.specialization?.name || "Not specified"}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 mb-1">
                Assigned Technician
              </h3>
              <p className="text-lg font-semibold text-gray-900">
                {ticket.assignedTo?.name || "Unassigned"}
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 mb-1">
                SLA Status
              </h3>
              <p
                className={`text-lg font-semibold ${ticket.slaStatus === "OVERDUE" ? "text-red-600" : "text-gray-900"}`}
              >
                {ticket.slaStatus}
              </p>
              {ticket.slaDeadline && (
                <p className="text-sm text-gray-500 mt-1">
                  {format(new Date(ticket.slaDeadline), "MMM dd, yyyy HH:mm")}
                </p>
              )}
            </div>
          </div>

          {canUpdateStatus && (
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">
                Update Status
              </h3>
              <div className="flex space-x-2">
                {["IN_PROGRESS", "RESOLVED", "CLOSED"].map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    disabled={statusLoading !== null}
                    className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:from-indigo-700 hover:to-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {statusLoading === status ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Updating...</span>
                      </>
                    ) : (
                      status
                    )}
                  </button>
                ))}
                <button
                  onClick={() => setShowActionNeededForm(true)}
                  disabled={statusLoading !== null || actionNeededLoading}
                  className="px-4 py-2 bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white rounded-lg hover:from-fuchsia-700 hover:to-pink-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {actionNeededLoading && showActionNeededForm ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Sending...</span>
                    </>
                  ) : (
                    "USER_ACTION_NEEDED"
                  )}
                </button>
              </div>

              {showActionNeededForm && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message to the user (required)
                  </label>
                  <textarea
                    value={actionNeededComment}
                    onChange={(e) => setActionNeededComment(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fuchsia-500 focus:border-fuchsia-500 transition-all"
                    placeholder="Explain what action the user must take and what you need them to confirm."
                  />
                  <div className="flex items-center gap-3 mt-3">
                    <button
                      onClick={handleSendActionNeeded}
                      disabled={!actionNeededComment.trim() || actionNeededLoading}
                      className="px-4 py-2 bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white rounded-lg hover:from-fuchsia-700 hover:to-pink-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionNeededLoading ? "Sending..." : "Send Request"}
                    </button>
                    <button
                      onClick={() => {
                        setShowActionNeededForm(false);
                        setActionNeededComment('');
                      }}
                      disabled={actionNeededLoading}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {canAssign && (
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">
                Assign to Team
              </h3>
              {specializations.length === 0 ? (
                <p className="text-gray-500">No specializations available</p>
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
                  <option value="">Select team (specialization)</option>
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
                  ? "Reassign to Team"
                  : "Reassign Ticket"}
              </h3>
              {ticket.problemType === "CUSTOM" ? (
                // For CUSTOM tickets: Show specialization selection
                specializations.length === 0 ? (
                  <p className="text-gray-500">No specializations available</p>
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
                    <option value="">Select team (specialization)</option>
                    {specializations.map((spec) => (
                      <option key={spec.id} value={spec.id}>
                        {spec.name}{" "}
                        {spec.description ? `- ${spec.description}` : ""}
                      </option>
                    ))}
                  </select>
                )
              ) : // For non-CUSTOM tickets: Show technician selection (existing behavior)
              technicians.length === 0 ? (
                <p className="text-gray-500">No technicians available</p>
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
                  <option value="">Select technician</option>
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.name} - {tech.specialization?.name || "No specialization"}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">
              Conversation
            </h3>

            {messages.length === 0 ? (
              <p className="text-gray-500">No messages yet.</p>
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
                          {m.type === 'ACTION_REQUEST'
                            ? 'Action Request'
                            : 'User Reply'}{" "}
                          - {m.author?.name || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
                          {m.body}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 whitespace-nowrap">
                        {m.createdAt ? new Date(m.createdAt).toLocaleString() : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {user?.role === 'USER' &&
              latestIncomingActionRequestForUser &&
              !latestReplyForRequestByUser && (
                <div className="mt-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-2">
                    Confirm this request
                  </h4>
                  <textarea
                    value={userReply}
                    onChange={(e) => setUserReply(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                    placeholder="Write your confirmation or response to the engineer."
                  />
                  <div className="flex items-center gap-3 mt-3">
                    <button
                      onClick={handleConfirmUserReply}
                      disabled={!userReply.trim() || userReplyLoading}
                      className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-lg hover:from-indigo-700 hover:to-blue-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {userReplyLoading ? 'Confirming...' : 'Confirm'}
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
