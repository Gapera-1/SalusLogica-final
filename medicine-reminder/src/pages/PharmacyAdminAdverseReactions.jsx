import React, { useState, useEffect } from "react";
import {
  AlertTriangle, Filter, ChevronDown, ArrowLeft,
  ShieldAlert, CheckCircle2, Clock, User, Pill,
  FileText, CircleDot, Activity, ShieldCheck,
  X, Calendar, Thermometer, Stethoscope, Info,
  Heart, ClipboardList, AlertCircle, Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";
import BaseLayout from "../components/BaseLayout";
import { useLanguage } from "../i18n";
import { useTheme } from "../contexts/ThemeContext";
import { API_BASE_URL } from "../services/api";

/* ───────── keyframes ───────── */
const STYLE_ID = "pa-rx-anim";
if (typeof document !== "undefined" && !document.getElementById(STYLE_ID)) {
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
    @keyframes pa-fade-up { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
    .pa-fade-up { animation: pa-fade-up .45s ease both }
    @keyframes pa-slide-in { from{opacity:0;transform:translateX(100%)} to{opacity:1;transform:translateX(0)} }
    @keyframes pa-fade-overlay { from{opacity:0} to{opacity:1} }
    .pa-slide-in { animation: pa-slide-in .3s ease both }
    .pa-fade-overlay { animation: pa-fade-overlay .2s ease both }
  `;
  document.head.appendChild(s);
}

/* severity config */
const SEV = {
  severe:           { gradient: "from-red-500 to-rose-600",     bg: "bg-red-500",    light: "bg-red-100 text-red-700",     dark: "bg-red-900/50 text-red-300",     icon: ShieldAlert },
  life_threatening: { gradient: "from-red-600 to-red-800",      bg: "bg-red-700",    light: "bg-red-100 text-red-800",     dark: "bg-red-900/60 text-red-200",     icon: AlertCircle },
  moderate:         { gradient: "from-amber-500 to-orange-500", bg: "bg-amber-500",  light: "bg-amber-100 text-amber-700", dark: "bg-amber-900/50 text-amber-300", icon: AlertTriangle },
  mild:             { gradient: "from-teal-500 to-emerald-500", bg: "bg-teal-500",   light: "bg-teal-100 text-teal-700",   dark: "bg-teal-900/50 text-teal-300",   icon: Activity },
};

const PharmacyAdminAdverseReactions = ({ setIsAuthenticated }) => {
  const { t } = useLanguage();
  const { isDark } = useTheme();

  const [reactions, setReactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterResolved, setFilterResolved] = useState("all");

  /* detail slide-over */
  const [detailData, setDetailData] = useState(null);
  /* resolve action */
  const [resolvingId, setResolvingId] = useState(null);

  const token = localStorage.getItem("access_token");
  const headers = { "Content-Type": "application/json", Authorization: `Token ${token}` };

  /* ─── theme tokens ─── */
  const c = isDark
    ? {
        pageBg: "bg-gray-950", surfaceBg: "bg-gray-900", surfaceBorder: "border-gray-800",
        textH: "text-gray-100", textP: "text-gray-400", textMuted: "text-gray-500",
        inputBg: "bg-gray-800", inputBorder: "border-gray-700",
        cardHover: "hover:shadow-xl hover:border-gray-700",
        errorBg: "bg-red-900/30", errorBorder: "border-red-800", errorText: "text-red-300",
        divider: "border-gray-800",
        modalBg: "bg-gray-900", overlayBg: "bg-black/60",
        infoBg: "bg-gray-800/60",
      }
    : {
        pageBg: "bg-gray-50", surfaceBg: "bg-white", surfaceBorder: "border-gray-200",
        textH: "text-gray-900", textP: "text-gray-600", textMuted: "text-gray-400",
        inputBg: "bg-gray-100", inputBorder: "border-gray-300",
        cardHover: "hover:shadow-xl hover:border-gray-300",
        errorBg: "bg-red-50", errorBorder: "border-red-200", errorText: "text-red-700",
        divider: "border-gray-100",
        modalBg: "bg-white", overlayBg: "bg-black/40",
        infoBg: "bg-gray-50",
      };

  /* ─── fetch reactions ─── */
  const fetchReactions = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (filterSeverity !== "all") params.append("severity", filterSeverity);
      if (filterResolved !== "all") params.append("is_resolved", filterResolved === "resolved" ? "true" : "false");
      const response = await fetch(
        `${API_BASE_URL}/pharmacy-admin/adverse-reactions/?${params}`,
        { headers }
      );
      if (!response.ok) throw new Error("Failed to fetch adverse reactions");
      const data = await response.json();
      setReactions(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error("Error fetching adverse reactions:", err);
      setError(err.message || "Failed to load adverse reactions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterSeverity, filterResolved]);

  /* ─── View detail ─── */
  const handleViewDetail = async (rx) => {
    setDetailData({ ...rx, _loading: true });
    try {
      const res = await fetch(
        `${API_BASE_URL}/pharmacy-admin/adverse-reactions/${rx.id}/`,
        { headers }
      );
      if (res.ok) {
        const data = await res.json();
        setDetailData({ ...data, _loading: false });
      } else {
        setDetailData({ ...rx, _loading: false });
      }
    } catch {
      setDetailData({ ...rx, _loading: false });
    }
  };

  /* ─── Mark as resolved ─── */
  const handleMarkResolved = async (rxId) => {
    setResolvingId(rxId);
    try {
      const res = await fetch(
        `${API_BASE_URL}/pharmacy-admin/adverse-reactions/${rxId}/`,
        {
          method: "PATCH",
          headers,
          body: JSON.stringify({ is_resolved: true, resolved_date: new Date().toISOString() }),
        }
      );
      if (res.ok) {
        setReactions(prev =>
          prev.map(r => r.id === rxId ? { ...r, is_resolved: true, resolved_date: new Date().toISOString() } : r)
        );
        if (detailData && detailData.id === rxId) {
          setDetailData(prev => ({ ...prev, is_resolved: true, resolved_date: new Date().toISOString() }));
        }
      }
    } catch (err) {
      console.error("Error resolving reaction:", err);
    } finally {
      setResolvingId(null);
    }
  };

  const getSev = (severity) => SEV[severity] || SEV.mild;

  /* ─── loading ─── */
  if (loading) {
    return (
      <BaseLayout showNavigation setIsAuthenticated={setIsAuthenticated}>
        <div className={`min-h-screen ${c.pageBg} flex items-center justify-center`}>
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-teal-200 dark:border-teal-900 opacity-30" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-teal-500 animate-spin" />
            </div>
            <p className={`${c.textP} font-medium`}>{t("pharmacyAdminAdverseReactions.loading")}</p>
          </div>
        </div>
      </BaseLayout>
    );
  }

  /* ═══════════════════ RENDER ═══════════════════ */
  return (
    <BaseLayout showNavigation setIsAuthenticated={setIsAuthenticated}>
      <div className={`min-h-screen ${c.pageBg} pb-12`}>

        {/* ─── HERO HEADER ─── */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-600 via-pink-500 to-red-500" />
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-white/10 rounded-full blur-2xl" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
            <div className="pa-fade-up">
              <Link
                to="/pharmacy-admin/dashboard"
                className="inline-flex items-center gap-1.5 text-white/70 hover:text-white text-sm mb-4 transition-colors"
              >
                <ArrowLeft size={16} />
                {t("pharmacyAdminDashboard.title")}
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                  <ShieldAlert className="text-white" size={24} />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white">
                    {t("pharmacyAdminAdverseReactions.title")}
                  </h1>
                  <p className="text-rose-100 text-sm mt-0.5">{t("pharmacyAdminAdverseReactions.subtitle")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── MAIN CONTENT ─── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-10">

          {error && (
            <div className={`mb-6 rounded-xl border ${c.errorBorder} ${c.errorBg} p-4 pa-fade-up flex items-center gap-3`}>
              <CircleDot className="text-red-500 shrink-0" size={18} />
              <p className={`${c.errorText} text-sm`}>{error}</p>
            </div>
          )}

          {/* ─── FILTERS ─── */}
          <div className={`${c.surfaceBg} rounded-2xl border ${c.surfaceBorder} shadow-lg p-5 sm:p-6 mb-6 pa-fade-up`}>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Filter size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${c.textMuted}`} />
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className={`w-full appearance-none pl-9 pr-9 py-2.5 rounded-xl ${c.inputBg} border ${c.inputBorder}
                              ${c.textH} focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500
                              transition-all text-sm cursor-pointer`}
                >
                  <option value="all">{t("pharmacyAdminAdverseReactions.allSeverities")}</option>
                  <option value="mild">{t("pharmacyAdminAdverseReactions.mild")}</option>
                  <option value="moderate">{t("pharmacyAdminAdverseReactions.moderate")}</option>
                  <option value="severe">{t("pharmacyAdminAdverseReactions.severe")}</option>
                </select>
                <ChevronDown size={16} className={`absolute right-3 top-1/2 -translate-y-1/2 ${c.textMuted} pointer-events-none`} />
              </div>
              <div className="flex-1 relative">
                <Filter size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${c.textMuted}`} />
                <select
                  value={filterResolved}
                  onChange={(e) => setFilterResolved(e.target.value)}
                  className={`w-full appearance-none pl-9 pr-9 py-2.5 rounded-xl ${c.inputBg} border ${c.inputBorder}
                              ${c.textH} focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500
                              transition-all text-sm cursor-pointer`}
                >
                  <option value="all">{t("pharmacyAdminAdverseReactions.allStatus")}</option>
                  <option value="unresolved">{t("pharmacyAdminAdverseReactions.unresolved")}</option>
                  <option value="resolved">{t("pharmacyAdminAdverseReactions.resolved")}</option>
                </select>
                <ChevronDown size={16} className={`absolute right-3 top-1/2 -translate-y-1/2 ${c.textMuted} pointer-events-none`} />
              </div>
            </div>
          </div>

          {/* ─── REACTIONS LIST ─── */}
          {reactions.length > 0 ? (
            <div className="space-y-4">
              {reactions.map((rx, idx) => {
                const sev = getSev(rx.severity);
                const SevIcon = sev.icon;
                const isResolving = resolvingId === rx.id;

                return (
                  <div
                    key={rx.id}
                    className={`${c.surfaceBg} rounded-2xl border ${c.surfaceBorder} shadow-lg
                                ${c.cardHover} transition-all duration-300 overflow-hidden pa-fade-up
                                ${rx.is_resolved ? "opacity-75" : ""}`}
                    style={{ animationDelay: `${0.06 * idx}s` }}
                  >
                    <div className={`h-1.5 bg-gradient-to-r ${sev.gradient}`} />

                    <div className="p-5 sm:p-6">
                      {/* top row */}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-xl ${sev.bg} bg-opacity-20 flex items-center justify-center`}>
                            <SevIcon size={20} className={sev.bg.replace("bg-", "text-")} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <User size={14} className={c.textMuted} />
                              <h3 className={`font-semibold ${c.textH}`}>
                                {rx.patient_name || rx.patient_username || t("pharmacyAdminAdverseReactions.patient")}
                              </h3>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Pill size={13} className={c.textMuted} />
                              <span className={`text-sm ${c.textP} font-medium`}>
                                {rx.medication_name || t("pharmacyAdminAdverseReactions.unknownMedicine")}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold
                                           ${isDark ? sev.dark : sev.light}`}>
                            <SevIcon size={12} />
                            {rx.severity?.charAt(0).toUpperCase() + rx.severity?.slice(1)}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold
                                           ${rx.is_resolved
                                             ? (isDark ? "bg-emerald-900/50 text-emerald-300" : "bg-emerald-100 text-emerald-700")
                                             : (isDark ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-600")}`}>
                            {rx.is_resolved ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                            {rx.is_resolved ? t("pharmacyAdminAdverseReactions.resolved") : t("pharmacyAdminAdverseReactions.unresolved")}
                          </span>
                        </div>
                      </div>

                      {/* symptoms preview */}
                      <div className={`rounded-xl p-3.5 mb-4 ${isDark ? "bg-gray-800/60" : "bg-gray-50"}`}>
                        <p className={`text-xs font-semibold uppercase tracking-wider ${c.textMuted} mb-1`}>
                          {t("pharmacyAdminAdverseReactions.description") || "Description / Symptoms"}
                        </p>
                        <p className={`text-sm ${c.textH} leading-relaxed`}
                           style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {rx.symptoms || "—"}
                        </p>
                      </div>

                      {/* type + date row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                        <div className={`rounded-xl p-3 ${isDark ? "bg-gray-800/60" : "bg-gray-50"}`}>
                          <p className={`text-xs font-semibold uppercase tracking-wider ${c.textMuted} mb-1`}>
                            {t("pharmacyAdminAdverseReactions.reactionType")}
                          </p>
                          <p className={`text-sm ${c.textH} capitalize font-medium`}>
                            {rx.reaction_type?.replace(/_/g, " ") || "—"}
                          </p>
                        </div>
                        <div className={`rounded-xl p-3 ${isDark ? "bg-gray-800/60" : "bg-gray-50"}`}>
                          <p className={`text-xs font-semibold uppercase tracking-wider ${c.textMuted} mb-1`}>
                            {t("pharmacyAdminAdverseReactions.reported") || "Reported"}
                          </p>
                          <p className={`text-sm ${c.textH} font-medium`}>
                            {rx.reported_date ? new Date(rx.reported_date).toLocaleDateString() : "—"}
                          </p>
                        </div>
                      </div>

                      {/* footer actions */}
                      <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3
                                       pt-4 border-t ${c.divider}`}>
                        <div className="flex items-center gap-1.5">
                          <Clock size={14} className={c.textMuted} />
                          <span className={`text-sm ${c.textP}`}>
                            {rx.onset_time
                              ? `${t("pharmacyAdminAdverseReactions.onset") || "Onset"}: ${new Date(rx.onset_time).toLocaleString()}`
                              : t("common.na")}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewDetail(rx)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold
                                       bg-teal-500/10 text-teal-600 dark:text-teal-400 hover:bg-teal-500/20
                                       transition-colors"
                          >
                            <FileText size={14} /> {t("pharmacyAdminAdverseReactions.viewDetails")}
                          </button>
                          {!rx.is_resolved && (
                            <button
                              onClick={() => handleMarkResolved(rx.id)}
                              disabled={isResolving}
                              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold
                                         transition-colors
                                         ${isResolving
                                           ? "bg-emerald-500/30 text-emerald-400 cursor-wait"
                                           : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"}`}
                            >
                              {isResolving
                                ? <><Loader2 size={14} className="animate-spin" /> Resolving...</>
                                : <><CheckCircle2 size={14} /> {t("pharmacyAdminAdverseReactions.markResolved")}</>}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={`${c.surfaceBg} rounded-2xl border ${c.surfaceBorder} shadow-lg p-12 text-center pa-fade-up`}>
              <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4
                              ${isDark ? "bg-gray-800" : "bg-gray-100"}`}>
                <ShieldCheck size={28} className={c.textMuted} />
              </div>
              <h3 className={`text-lg font-semibold ${c.textH} mb-1`}>
                {t("pharmacyAdminAdverseReactions.noReactions")}
              </h3>
              <p className={`text-sm ${c.textP} max-w-sm mx-auto`}>
                {filterSeverity !== "all" || filterResolved !== "all"
                  ? t("pharmacyAdminAdverseReactions.noMatchFilters")
                  : t("pharmacyAdminAdverseReactions.noReported")}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════ DETAIL SLIDE-OVER ═══════════ */}
      {detailData && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className={`absolute inset-0 ${c.overlayBg} pa-fade-overlay`} onClick={() => setDetailData(null)} />
          <div className={`relative w-full max-w-lg ${c.modalBg} shadow-2xl pa-slide-in overflow-y-auto`}>

            {/* header with severity gradient */}
            {(() => {
              const sev = getSev(detailData.severity);
              return (
                <div className={`sticky top-0 z-10 bg-gradient-to-r ${sev.gradient} p-5`}>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <FileText size={20} />
                      {t("pharmacyAdminAdverseReactions.reactionDetails") || "Reaction Details"}
                    </h2>
                    <button onClick={() => setDetailData(null)}
                      className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors">
                      <X size={18} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white">
                      {detailData.severity?.charAt(0).toUpperCase() + detailData.severity?.slice(1)}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold
                                     ${detailData.is_resolved ? "bg-emerald-500/30 text-emerald-100" : "bg-white/20 text-white"}`}>
                      {detailData.is_resolved ? <><CheckCircle2 size={12} /> Resolved</> : <><Clock size={12} /> Unresolved</>}
                    </span>
                  </div>
                </div>
              );
            })()}

            {detailData._loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-transparent border-t-teal-500 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="p-5 space-y-4">

                {/* Patient & Medicine header card */}
                <div className={`rounded-2xl p-4 ${c.infoBg} border ${c.surfaceBorder}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500
                                    flex items-center justify-center text-white font-bold text-lg">
                      {(detailData.patient_name || detailData.patient_username || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-wider ${c.textMuted}`}>
                        {t("pharmacyAdminAdverseReactions.patient") || "Patient"}
                      </p>
                      <h3 className={`text-base font-bold ${c.textH}`}>
                        {detailData.patient_name || detailData.patient_username || "—"}
                      </h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Pill size={16} className="text-emerald-500" />
                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-wider ${c.textMuted}`}>
                        {t("pharmacyAdminAdverseReactions.medicine") || "Medicine"}
                      </p>
                      <p className={`text-sm font-semibold ${c.textH}`}>
                        {detailData.medication_name || "—"}
                        {detailData.medication_dosage ? ` (${detailData.medication_dosage})` : ""}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Symptoms / Description */}
                <div className={`rounded-2xl p-4 ${c.infoBg} border ${c.surfaceBorder}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <ClipboardList size={16} className="text-amber-500" />
                    <p className={`text-xs font-semibold uppercase tracking-wider ${c.textMuted}`}>
                      {t("pharmacyAdminAdverseReactions.symptomsDescription") || "Symptoms / Description"}
                    </p>
                  </div>
                  <p className={`text-sm ${c.textH} leading-relaxed whitespace-pre-wrap`}>
                    {detailData.symptoms || "—"}
                  </p>
                </div>

                {/* Detail grid */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: Activity, label: t("pharmacyAdminAdverseReactions.reactionType") || "Type", value: detailData.reaction_type?.replace(/_/g, " ") },
                    { icon: Heart, label: t("pharmacyAdminAdverseReactions.outcome") || "Outcome", value: detailData.outcome?.replace(/_/g, " ") },
                    { icon: Calendar, label: t("pharmacyAdminAdverseReactions.reported") || "Reported", value: detailData.reported_date ? new Date(detailData.reported_date).toLocaleDateString() : "—" },
                    { icon: Clock, label: t("pharmacyAdminAdverseReactions.onset") || "Onset Time", value: detailData.onset_time ? new Date(detailData.onset_time).toLocaleString() : "—" },
                    { icon: Thermometer, label: t("pharmacyAdminAdverseReactions.duration") || "Duration", value: detailData.duration || "—" },
                    { icon: User, label: t("pharmacyAdminAdverseReactions.reportedBy") || "Reported By", value: detailData.reported_by?.replace(/_/g, " ") || "—" },
                    // eslint-disable-next-line no-unused-vars
                  ].map(({ icon: IC, label, value }, i) => (
                    <div key={i} className={`rounded-xl p-3 ${c.infoBg}`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <IC size={13} className="text-teal-500" />
                        <p className={`text-xs font-semibold uppercase tracking-wider ${c.textMuted}`}>{label}</p>
                      </div>
                      <p className={`text-sm font-medium ${c.textH} capitalize`}>{value || "—"}</p>
                    </div>
                  ))}
                </div>

                {/* Treatment */}
                {detailData.treatment_given && (
                  <div className={`rounded-2xl p-4 ${c.infoBg} border ${c.surfaceBorder}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Stethoscope size={16} className="text-blue-500" />
                      <p className={`text-xs font-semibold uppercase tracking-wider ${c.textMuted}`}>
                        {t("pharmacyAdminAdverseReactions.treatment") || "Treatment Given"}
                      </p>
                    </div>
                    <p className={`text-sm ${c.textH} leading-relaxed whitespace-pre-wrap`}>
                      {detailData.treatment_given}
                    </p>
                  </div>
                )}

                {/* Medication batch */}
                {detailData.medication_batch && (
                  <div className={`rounded-xl p-3 ${c.infoBg}`}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Info size={13} className="text-teal-500" />
                      <p className={`text-xs font-semibold uppercase tracking-wider ${c.textMuted}`}>
                        {t("pharmacyAdminAdverseReactions.batch") || "Medication Batch"}
                      </p>
                    </div>
                    <p className={`text-sm font-medium ${c.textH}`}>{detailData.medication_batch}</p>
                  </div>
                )}

                {/* Follow-up info */}
                {detailData.requires_follow_up && (
                  <div className={`rounded-2xl p-4 border-2 border-amber-500/30 ${isDark ? "bg-amber-900/10" : "bg-amber-50"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle size={16} className="text-amber-500" />
                      <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                        {t("pharmacyAdminAdverseReactions.followUpRequired") || "Follow-up Required"}
                      </p>
                    </div>
                    {detailData.follow_up_date && (
                      <p className={`text-sm ${c.textH} mb-1`}>
                        <span className={c.textMuted}>Date: </span>
                        {new Date(detailData.follow_up_date).toLocaleDateString()}
                      </p>
                    )}
                    {detailData.follow_up_notes && (
                      <p className={`text-sm ${c.textP} leading-relaxed`}>{detailData.follow_up_notes}</p>
                    )}
                  </div>
                )}

                {/* Drug info from registry */}
                {detailData.drug_info && detailData.drug_info.is_registered_in_rwanda && (
                  <div className={`rounded-2xl p-4 border ${c.surfaceBorder} ${c.infoBg}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <ShieldCheck size={16} className="text-emerald-500" />
                      <p className={`text-xs font-semibold uppercase tracking-wider ${c.textMuted}`}>
                        Rwanda FDA Registry
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        ["Brand", detailData.drug_info.brand_name],
                        ["Generic", detailData.drug_info.generic_name],
                        ["Strength", detailData.drug_info.strength],
                        ["Form", detailData.drug_info.form],
                        ["Manufacturer", detailData.drug_info.manufacturer],
                        ["Reg #", detailData.drug_info.registration_number],
                      ]
                        .filter(([, v]) => v)
                        .map(([label, value], i) => (
                          <div key={i}>
                            <span className={`${c.textMuted} font-semibold uppercase`}>{label}</span>
                            <p className={`${c.textH} font-medium`}>{value}</p>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Resolved info */}
                {detailData.is_resolved && detailData.resolved_date && (
                  <div className={`rounded-xl p-3 flex items-center gap-3 ${isDark ? "bg-emerald-900/20" : "bg-emerald-50"}`}>
                    <CheckCircle2 size={18} className="text-emerald-500" />
                    <div>
                      <p className={`text-xs font-semibold ${c.textMuted}`}>Resolved on</p>
                      <p className={`text-sm font-medium ${c.textH}`}>
                        {new Date(detailData.resolved_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}

                {/* Mark as resolved CTA */}
                {!detailData.is_resolved && (
                  <button
                    onClick={() => handleMarkResolved(detailData.id)}
                    disabled={resolvingId === detailData.id}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl
                               font-semibold transition-all shadow-sm text-sm
                               ${resolvingId === detailData.id
                                 ? "bg-emerald-500/40 text-emerald-200 cursor-wait"
                                 : "bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600"}`}
                  >
                    {resolvingId === detailData.id
                      ? <><Loader2 size={16} className="animate-spin" /> Resolving...</>
                      : <><CheckCircle2 size={16} /> {t("pharmacyAdminAdverseReactions.markResolved") || "Mark as Resolved"}</>}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </BaseLayout>
  );
};

export default PharmacyAdminAdverseReactions;
