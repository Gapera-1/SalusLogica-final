import React, { useState, useEffect, useRef, useCallback } from "react";
import { chatbotAPI } from "../services/api";
import { useLanguage } from "../i18n";

const ChatBot = () => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom whenever messages change
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  // Load chat history when first opened
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      loadHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const loadHistory = async () => {
    try {
      const data = await chatbotAPI.getHistory();
      if (data.messages && data.messages.length > 0) {
        setMessages(data.messages.map(m => ({
          role: m.role,
          content: m.content,
          timestamp: m.created_at,
        })));
        setSessionId(data.session_id);
      } else {
        // Show welcome message
        setMessages([{
          role: "assistant",
          content: t("chatbot.welcome") || "Hello! 👋 I'm SalusLogica AI, your health assistant. How can I help you today?",
          timestamp: new Date().toISOString(),
        }]);
      }
    } catch (err) {
      console.error("Failed to load chat history:", err);
      setMessages([{
        role: "assistant",
        content: t("chatbot.welcome") || "Hello! 👋 I'm SalusLogica AI, your health assistant. How can I help you today?",
        timestamp: new Date().toISOString(),
      }]);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    // Add user message to UI immediately
    const userMsg = { role: "user", content: text, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const data = await chatbotAPI.sendMessage(text, sessionId);
      if (data.session_id) setSessionId(data.session_id);

      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
          timestamp: data.message?.created_at || new Date().toISOString(),
        },
      ]);
    } catch (err) {
      console.error("Chatbot error:", err);
      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: t("chatbot.error") || "Sorry, I couldn't process your request. Please try again.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = async () => {
    setMessages([{
      role: "assistant",
      content: t("chatbot.welcome") || "Hello! 👋 I'm SalusLogica AI, your health assistant. How can I help you today?",
      timestamp: new Date().toISOString(),
    }]);
    setSessionId(null);
  };

  const toggleChat = () => {
    setIsOpen(prev => !prev);
    if (!isOpen) setHasNewMessage(false);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Simple markdown-ish renderer: bold, bullet lists, line breaks
  const renderContent = (text) => {
    if (!text) return null;
    return text.split("\n").map((line, i) => {
      // Bold **text**
      const parts = line.split(/(\*\*.*?\*\*)/g).map((segment, j) => {
        if (segment.startsWith("**") && segment.endsWith("**")) {
          return <strong key={j}>{segment.slice(2, -2)}</strong>;
        }
        // Italic *text*
        if (segment.startsWith("*") && segment.endsWith("*") && segment.length > 2) {
          return <em key={j}>{segment.slice(1, -1)}</em>;
        }
        return segment;
      });

      if (line.startsWith("• ") || line.startsWith("- ")) {
        return (
          <div key={i} className="flex items-start gap-1.5 ml-2">
            <span className="mt-1 text-xs">•</span>
            <span>{parts.slice(0)}</span>
          </div>
        );
      }

      if (/^\d+\.\s/.test(line)) {
        return (
          <div key={i} className="flex items-start gap-1.5 ml-2">
            <span>{parts}</span>
          </div>
        );
      }

      return (
        <div key={i}>
          {parts}
          {i < text.split("\n").length - 1 && line === "" && <br />}
        </div>
      );
    });
  };

  return (
    <>
      {/* ===== Floating Action Button ===== */}
      <button
        onClick={toggleChat}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-teal-300"
        style={{
          background: "linear-gradient(135deg, #0d9488 0%, #14b8a6 50%, #2dd4bf 100%)",
        }}
        aria-label={t("chatbot.toggle") || "Chat with AI"}
      >
        {isOpen ? (
          /* X icon */
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          /* Chat bubble icon */
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 20.25v-3.013a8.25 8.25 0 1114.5-5.487 8.25 8.25 0 01-14.5 5.487V20.25z" />
          </svg>
        )}

        {/* New message badge */}
        {hasNewMessage && !isOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />
        )}
      </button>

      {/* ===== Chat Window ===== */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fade-scale"
          style={{
            height: "min(550px, calc(100vh - 8rem))",
            background: "var(--bg-page, #f9fafb)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 text-white shrink-0"
            style={{
              background: "linear-gradient(135deg, #0d9488 0%, #14b8a6 50%, #2dd4bf 100%)",
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-sm">
                  {t("chatbot.title") || "SalusLogica AI"}
                </h3>
                <p className="text-xs text-white/70">
                  {t("chatbot.subtitle") || "Health Assistant"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* New chat button */}
              <button
                onClick={startNewChat}
                className="p-1.5 rounded-lg hover:bg-white/15 transition-colors"
                title={t("chatbot.newChat") || "New chat"}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </button>
              {/* Close button */}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/15 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-teal-600 text-white rounded-br-md"
                      : "bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-md shadow-sm border border-gray-100 dark:border-gray-700"
                  }`}
                >
                  <div className="space-y-1">{renderContent(msg.content)}</div>
                  <p
                    className={`text-[10px] mt-1.5 ${
                      msg.role === "user" ? "text-white/60" : "text-gray-400"
                    }`}
                  >
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <div className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <form onSubmit={sendMessage} className="shrink-0 border-t border-gray-200 dark:border-gray-700 px-3 py-2.5 bg-white dark:bg-gray-800">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t("chatbot.placeholder") || "Ask me anything about health..."}
                className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent placeholder-gray-400"
                disabled={loading}
                maxLength={2000}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-2 rounded-xl bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-400"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-1.5 text-center">
              {t("chatbot.disclaimer") || "AI responses are informational only. Always consult your healthcare provider."}
            </p>
          </form>
        </div>
      )}
    </>
  );
};

export default ChatBot;
