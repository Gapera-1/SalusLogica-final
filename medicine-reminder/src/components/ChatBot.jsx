import React, { useState, useEffect, useRef, useCallback } from "react";
import { chatbotAPI } from "../services/api";
import { useLanguage } from "../i18n";
import { useTheme } from "../contexts/ThemeContext";

/* ──────────────────────── responsive breakpoint hook ─────────────────────── */
const useIsMobile = (breakpoint = 640) => {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < breakpoint);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);
  return isMobile;
};

/* ──────────────────────────── inline keyframes ──────────────────────────── */
const injectStyles = (() => {
  let injected = false;
  return () => {
    if (injected) return;
    injected = true;
    const css = `
      /* chatbot open / close — desktop */
      @keyframes cb-slide-up   { from{opacity:0;transform:translateY(24px) scale(.96)} to{opacity:1;transform:translateY(0) scale(1)} }
      @keyframes cb-slide-down { from{opacity:1;transform:translateY(0) scale(1)}   to{opacity:0;transform:translateY(24px) scale(.96)} }
      .cb-enter { animation:cb-slide-up .32s cubic-bezier(.22,1,.36,1) forwards }
      .cb-exit  { animation:cb-slide-down .22s cubic-bezier(.55,.06,.68,.19) forwards }

      /* chatbot open / close — mobile (slide from bottom) */
      @keyframes cb-mobile-up   { from{opacity:0;transform:translateY(100%)} to{opacity:1;transform:translateY(0)} }
      @keyframes cb-mobile-down { from{opacity:1;transform:translateY(0)}    to{opacity:0;transform:translateY(100%)} }
      .cb-enter-mobile { animation:cb-mobile-up .35s cubic-bezier(.22,1,.36,1) forwards }
      .cb-exit-mobile  { animation:cb-mobile-down .25s cubic-bezier(.55,.06,.68,.19) forwards }

      /* FAB pulse ring */
      @keyframes cb-ring { 0%{box-shadow:0 0 0 0 rgba(20,184,166,.45)} 70%{box-shadow:0 0 0 12px rgba(20,184,166,0)} 100%{box-shadow:0 0 0 0 rgba(20,184,166,0)} }
      .cb-fab-ring { animation:cb-ring 2.5s infinite }

      /* typing dots */
      @keyframes cb-dot { 0%,80%,100%{transform:scale(0);opacity:.4} 40%{transform:scale(1);opacity:1} }
      .cb-dot1 { animation:cb-dot 1.4s infinite ease-in-out both }
      .cb-dot2 { animation:cb-dot 1.4s infinite ease-in-out both; animation-delay:.16s }
      .cb-dot3 { animation:cb-dot 1.4s infinite ease-in-out both; animation-delay:.32s }

      /* message entrance */
      @keyframes cb-msg-in { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
      .cb-msg-in { animation:cb-msg-in .28s ease-out forwards }

      /* scrollbar */
      .cb-scroll::-webkit-scrollbar { width:5px }
      .cb-scroll::-webkit-scrollbar-track { background:transparent }
      .cb-scroll::-webkit-scrollbar-thumb { background:rgba(148,163,184,.35); border-radius:9px }
      .cb-scroll::-webkit-scrollbar-thumb:hover { background:rgba(148,163,184,.55) }

      /* quick-chip hover */
      .cb-chip { transition:all .18s ease }
      .cb-chip:hover { transform:translateY(-1px);box-shadow:0 2px 8px rgba(0,0,0,.08) }
    `;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
  };
})();

/* ─────────────────────────────── constants ───────────────────────────────── */
const QUICK_PROMPTS = [
  { icon: "💊", labelKey: "chatbot.qMeds",   fallback: "Medication info",    prompt: "Tell me about common medication side effects" },
  { icon: "⚠️", labelKey: "chatbot.qInter",  fallback: "Drug interactions",  prompt: "How do drug interactions work?" },
  { icon: "🩺", labelKey: "chatbot.qHealth", fallback: "Health tips",        prompt: "Give me some general health tips" },
  { icon: "⏰", labelKey: "chatbot.qRemind", fallback: "Reminders",          prompt: "How can I set up my medication reminders?" },
];

/* ═══════════════════════════════ COMPONENT ═══════════════════════════════ */
const ChatBot = () => {
  const { t } = useLanguage();
  const { isDark } = useTheme();
  const isMobile = useIsMobile();

  const [isOpen, setIsOpen] = useState(false);
  const [closing, setClosing] = useState(false);       // exit animation flag
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [showQuickPrompts, setShowQuickPrompts] = useState(true);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // inject CSS once
  useEffect(injectStyles, []);

  /* ─── scroll ─── */
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);
  useEffect(scrollToBottom, [messages, scrollToBottom]);

  /* ─── focus ─── */
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 280);
  }, [isOpen]);

  /* ─── load history ─── */
  useEffect(() => {
    if (isOpen && messages.length === 0) loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const welcomeMsg = () => ({
    role: "assistant",
    content: t("chatbot.welcome") || "Hello! 👋 I'm SalusLogica AI, your health assistant. How can I help you today?",
    timestamp: new Date().toISOString(),
  });

  const loadHistory = async () => {
    try {
      const data = await chatbotAPI.getHistory();
      if (data.messages?.length) {
        setMessages(data.messages.map(m => ({ role: m.role, content: m.content, timestamp: m.created_at })));
        setSessionId(data.session_id);
        setShowQuickPrompts(false);
      } else {
        setMessages([welcomeMsg()]);
      }
    } catch {
      setMessages([welcomeMsg()]);
    }
  };

  /* ─── send ─── */
  const sendMessage = async (e) => {
    e?.preventDefault?.();
    const text = (typeof e === "string" ? e : input).trim();
    if (!text || loading) return;

    setShowQuickPrompts(false);
    setMessages(prev => [...prev, { role: "user", content: text, timestamp: new Date().toISOString() }]);
    setInput("");
    setLoading(true);

    try {
      const data = await chatbotAPI.sendMessage(text, sessionId);
      if (data.session_id) setSessionId(data.session_id);
      setMessages(prev => [...prev, { role: "assistant", content: data.reply, timestamp: data.message?.created_at || new Date().toISOString() }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: t("chatbot.error") || "Sorry, I couldn't process your request. Please try again.", timestamp: new Date().toISOString() }]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPrompt = (prompt) => {
    setInput("");
    setShowQuickPrompts(false);
    setMessages(prev => [...prev, { role: "user", content: prompt, timestamp: new Date().toISOString() }]);
    setLoading(true);
    chatbotAPI.sendMessage(prompt, sessionId).then(data => {
      if (data.session_id) setSessionId(data.session_id);
      setMessages(prev => [...prev, { role: "assistant", content: data.reply, timestamp: data.message?.created_at || new Date().toISOString() }]);
    }).catch(() => {
      setMessages(prev => [...prev, { role: "assistant", content: t("chatbot.error") || "Sorry, I couldn't process your request.", timestamp: new Date().toISOString() }]);
    }).finally(() => setLoading(false));
  };

  const startNewChat = () => {
    setMessages([welcomeMsg()]);
    setSessionId(null);
    setShowQuickPrompts(true);
  };

  const openChat = () => { setIsOpen(true); setClosing(false); setHasNewMessage(false); };
  const closeChat = () => { setClosing(true); setTimeout(() => { setIsOpen(false); setClosing(false); }, 220); };
  const toggleChat = () => (isOpen ? closeChat() : openChat());

  const formatTime = (ts) => { if (!ts) return ""; return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); };

  /* ─── markdown renderer ─── */
  const renderContent = (text) => {
    if (!text) return null;
    const lines = text.split("\n");
    return lines.map((line, i) => {
      const parts = line.split(/(\*\*.*?\*\*)/g).map((seg, j) => {
        if (seg.startsWith("**") && seg.endsWith("**")) return <strong key={j} className="font-semibold">{seg.slice(2, -2)}</strong>;
        if (seg.startsWith("*") && seg.endsWith("*") && seg.length > 2) return <em key={j}>{seg.slice(1, -1)}</em>;
        return seg;
      });
      if (line.startsWith("• ") || line.startsWith("- ")) return <div key={i} className="flex items-start gap-2 ml-1 mt-0.5"><span className="text-teal-500 mt-0.5 text-[10px] leading-none select-none">●</span><span className="flex-1">{parts}</span></div>;
      if (/^\d+\.\s/.test(line)) return <div key={i} className="ml-1 mt-0.5">{parts}</div>;
      return <div key={i}>{parts}{i < lines.length - 1 && line === "" && <br />}</div>;
    });
  };

  /* ──────────────────── colour tokens (light / dark) ──────────────────── */
  const c = isDark ? {
    pageBg: "#0f172a", surfaceBg: "#1e293b", surfaceBorder: "#334155",
    bubbleAssistBg: "#1e293b", bubbleAssistBorder: "#334155",
    textPrimary: "#f1f5f9", textSecondary: "#94a3b8", textMuted: "#64748b",
    inputBg: "#0f172a", inputBorder: "#334155",
    chipBg: "#1e293b", chipBorder: "#334155", chipText: "#cbd5e1",
  } : {
    pageBg: "#f8fafc", surfaceBg: "#ffffff", surfaceBorder: "#e2e8f0",
    bubbleAssistBg: "#ffffff", bubbleAssistBorder: "#e5e7eb",
    textPrimary: "#1e293b", textSecondary: "#64748b", textMuted: "#94a3b8",
    inputBg: "#f1f5f9", inputBorder: "#e2e8f0",
    chipBg: "#f0fdfa", chipBorder: "#ccfbf1", chipText: "#0f766e",
  };

  /* ═══════════════════════════════ RENDER ════════════════════════════════ */
  /* sizing tokens */
  const fabSize = isMobile ? 52 : 60;
  const fabPos  = isMobile ? { bottom: 16, right: 16 } : { bottom: 24, right: 24 };

  const windowStyle = isMobile
    ? { inset: 0, borderRadius: 0, width: "100%", height: "100%" }           /* full-screen on mobile */
    : {
        bottom: 88, right: 24,
        width: 400, maxWidth: "calc(100vw - 2rem)",
        height: "min(600px, calc(100vh - 7rem))",
        borderRadius: 20,
      };

  const animEnter = isMobile ? "cb-enter-mobile" : "cb-enter";
  const animExit  = isMobile ? "cb-exit-mobile"  : "cb-exit";

  return (
    <>
      {/* =================== FLOATING ACTION BUTTON =================== */}
      {/* Hide FAB when chat is open on mobile (chat is full-screen) */}
      {!(isMobile && isOpen) && (
        <button
          onClick={toggleChat}
          aria-label={t("chatbot.toggle") || "Chat with AI"}
          className={`fixed z-[9999] group focus:outline-none ${!isOpen ? "cb-fab-ring" : ""}`}
          style={{ ...fabPos, width: fabSize, height: fabSize }}
        >
          {/* glow layer */}
          <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"
               style={{ background: "radial-gradient(circle, rgba(20,184,166,.25) 0%, transparent 70%)", transform: "scale(1.7)" }} />

          {/* main circle */}
          <div
            className="relative w-full h-full rounded-full flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl group-active:scale-95"
            style={{ background: "linear-gradient(145deg, #0d9488, #14b8a6)" }}
          >
            <div className="transition-transform duration-300" style={{ transform: isOpen ? "rotate(90deg)" : "rotate(0)" }}>
              {isOpen ? (
                <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6 sm:w-7 sm:h-7 text-white drop-shadow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.556 0 8.25-3.358 8.25-7.5S16.556 5.25 12 5.25 3.75 8.608 3.75 12.75c0 1.632.563 3.14 1.523 4.353L3.75 20.25l3.176-.94A9.137 9.137 0 0012 20.25z" />
                  <circle cx="8.5" cy="12.75" r="1" fill="currentColor" />
                  <circle cx="12"  cy="12.75" r="1" fill="currentColor" />
                  <circle cx="15.5" cy="12.75" r="1" fill="currentColor" />
                </svg>
              )}
            </div>
          </div>

          {/* notification badge */}
          {hasNewMessage && !isOpen && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 border-2 border-white" />
            </span>
          )}
        </button>
      )}

      {/* =================== CHAT WINDOW =================== */}
      {isOpen && (
        <div
          className={`fixed z-[9998] flex flex-col overflow-hidden ${closing ? animExit : animEnter}`}
          style={{
            ...windowStyle,
            background: c.pageBg,
            boxShadow: isMobile ? "none" : (isDark
              ? "0 25px 60px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.06)"
              : "0 25px 60px rgba(0,0,0,.12), 0 0 0 1px rgba(0,0,0,.04)"),
          }}
        >
          {/* ──── HEADER ──── */}
          <div className="shrink-0 relative overflow-hidden" style={{ padding: isMobile ? "14px 16px 12px" : "16px 18px 14px" }}>
            {/* gradient bg */}
            <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)" }} />
            {/* subtle pattern */}
            <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 20%, #fff 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

            {/* safe-area padding on mobile (notch / dynamic island) */}
            <div className="relative flex items-center justify-between" style={isMobile ? { paddingTop: "env(safe-area-inset-top, 0px)" } : undefined}>
              <div className="flex items-center gap-3">
                {/* back arrow on mobile instead of avatar */}
                {isMobile ? (
                  <button onClick={closeChat} className="w-9 h-9 -ml-1 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-all">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                  </button>
                ) : (
                  /* avatar (desktop only) */
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,.18)", backdropFilter: "blur(8px)" }}>
                      <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                      </svg>
                    </div>
                    {/* online dot */}
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-teal-700" />
                  </div>
                )}

                <div>
                  <h3 className="text-white font-bold text-[15px] leading-tight tracking-tight">
                    {t("chatbot.title") || "SalusLogica AI"}
                  </h3>
                  <p className="text-emerald-200/80 text-[11px] font-medium mt-0.5">
                    {t("chatbot.subtitle") || "Health Assistant"} · {t("chatbot.online") || "Online"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-0.5">
                <button onClick={startNewChat} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all" title={t("chatbot.newChat") || "New chat"}>
                  <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                  </svg>
                </button>
                {/* close chevron — desktop only (mobile uses the back arrow) */}
                {!isMobile && (
                  <button onClick={closeChat} className="w-8 h-8 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-all">
                    <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ──── MESSAGES ──── */}
          <div className="flex-1 overflow-y-auto cb-scroll" style={{ padding: isMobile ? "12px 12px 8px" : "14px 16px 8px" }}>
            {messages.map((msg, idx) => {
              const isUser = msg.role === "user";
              return (
                <div key={idx} className={`cb-msg-in flex mb-3 ${isUser ? "justify-end" : "justify-start"}`} style={{ animationDelay: `${Math.min(idx * 40, 200)}ms` }}>
                  {/* assistant avatar */}
                  {!isUser && (
                    <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center mr-2 mt-1" style={{ background: "linear-gradient(135deg, #0d9488, #14b8a6)" }}>
                      <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                      </svg>
                    </div>
                  )}

                  <div
                    className="relative group"
                    style={{
                      maxWidth: isMobile ? "88%" : "82%",
                      borderRadius: isUser ? "18px 18px 6px 18px" : "18px 18px 18px 6px",
                      padding: isMobile ? "10px 12px" : "10px 14px",
                      fontSize: isMobile ? 14 : 13.5,
                      lineHeight: 1.55,
                      ...(isUser
                        ? { background: "linear-gradient(135deg, #0d9488, #0f766e)", color: "#fff" }
                        : { background: c.bubbleAssistBg, border: `1px solid ${c.bubbleAssistBorder}`, color: c.textPrimary }),
                      ...(isUser ? {} : { boxShadow: "0 1px 3px rgba(0,0,0,.04)" }),
                    }}
                  >
                    <div className="space-y-0.5">{renderContent(msg.content)}</div>
                    <p className="mt-1.5 text-right select-none" style={{ fontSize: 10, color: isUser ? "rgba(255,255,255,.5)" : c.textMuted }}>
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* typing indicator */}
            {loading && (
              <div className="cb-msg-in flex justify-start mb-3">
                <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center mr-2 mt-1" style={{ background: "linear-gradient(135deg, #0d9488, #14b8a6)" }}>
                  <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <div style={{ background: c.bubbleAssistBg, border: `1px solid ${c.bubbleAssistBorder}`, borderRadius: "18px 18px 18px 6px", padding: "12px 18px" }}>
                  <div className="flex items-center gap-[6px]">
                    <div className="cb-dot1 w-[7px] h-[7px] rounded-full bg-teal-500" />
                    <div className="cb-dot2 w-[7px] h-[7px] rounded-full bg-teal-500" />
                    <div className="cb-dot3 w-[7px] h-[7px] rounded-full bg-teal-500" />
                  </div>
                </div>
              </div>
            )}

            {/* quick prompts (only visible when chat is fresh) */}
            {showQuickPrompts && messages.length <= 1 && !loading && (
              <div className={`mt-3 flex flex-wrap items-center gap-2 ${isMobile ? "px-1" : ""}`}>
                {QUICK_PROMPTS.map((qp, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickPrompt(qp.prompt)}
                    className="cb-chip inline-flex items-center gap-1.5 rounded-full px-3.5 py-[7px] text-xs font-medium cursor-pointer"
                    style={{ background: c.chipBg, border: `1px solid ${c.chipBorder}`, color: c.chipText }}
                  >
                    <span>{qp.icon}</span>
                    {t(qp.labelKey) || qp.fallback}
                  </button>
                ))}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ──── INPUT ──── */}
          <div className="shrink-0" style={{ padding: isMobile ? "0 10px 10px" : "0 14px 12px", paddingBottom: isMobile ? "calc(env(safe-area-inset-bottom, 8px) + 8px)" : 12 }}>
            <form onSubmit={sendMessage} className="flex items-end gap-2 rounded-2xl p-1.5" style={{ background: c.surfaceBg, border: `1px solid ${c.surfaceBorder}` }}>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t("chatbot.placeholder") || "Ask me anything about health..."}
                disabled={loading}
                maxLength={2000}
                className="flex-1 bg-transparent border-none outline-none text-sm sm:text-[13.5px] placeholder:text-sm"
                style={{ padding: "8px 10px", color: c.textPrimary }}
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  background: input.trim() && !loading ? "linear-gradient(135deg, #0d9488, #0f766e)" : (isDark ? "#334155" : "#e2e8f0"),
                  color: input.trim() && !loading ? "#fff" : c.textMuted,
                }}
              >
                <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </form>
            <p className="text-center mt-2 select-none" style={{ fontSize: 10, color: c.textMuted }}>
              {t("chatbot.disclaimer") || "AI responses are informational only. Always consult your healthcare provider."}
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;
