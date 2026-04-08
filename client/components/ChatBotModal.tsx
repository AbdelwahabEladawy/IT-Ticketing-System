import { useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import api from '../utils/api';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

export default function ChatBotModal() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const isFirstAssistantReply = !messages.some((m) => m.role === 'assistant');

    const newMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', text: trimmed }
    ];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const response = await api.post('/llm/chat', {
        message: trimmed,
        isFirstMessage: isFirstAssistantReply,
      });
      const answer = response.data?.answer?.trim() || 'No response from the model.';
      setMessages((prev) => [...prev, { role: 'assistant', text: answer }]);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to get a response from the model.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-xl shadow-indigo-500/20 transition hover:bg-indigo-700"
      >
        <MessageCircle className="h-5 w-5" />
        Chat with Global AI
      </button> */}


      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-4 sm:p-6">
          <div className="w-full max-w-xl rounded-3xl border border-gray-200 bg-white shadow-2xl shadow-black/10">
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3 sm:px-5">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Global AI</h2>
                <p className="text-xs text-gray-500">Ask the Global AI model for help.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[60vh] space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
              {messages.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
                  Ask a question and the Global AI model will answer. If the answer is enough, no ticket is created.
                </div>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`rounded-3xl px-4 py-3 text-sm shadow-sm ${
                      message.role === 'user'
                        ? 'self-end bg-indigo-600 text-white'
                        : 'self-start bg-gray-100 text-gray-900'
                    }`}
                  >
                    {message.text}
                  </div>
                ))
              )}
              {loading && (
                <div className="rounded-3xl px-4 py-3 text-sm text-gray-700 bg-gray-100">
                  Model is thinking...
                </div>
              )}
              {error && (
                <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
                  {error}
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 px-4 py-4 sm:px-5">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      sendMessage();
                    }
                  }}
                  className="flex-1 rounded-2xl border border-gray-300 px-4 py-3 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  placeholder="Ask your question..."
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Send className="h-4 w-4" />
                  {loading ? 'Thinking...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
