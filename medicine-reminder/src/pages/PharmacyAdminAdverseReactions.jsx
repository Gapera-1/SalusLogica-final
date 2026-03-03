import React, { useState, useEffect } from "react";
import {
  AlertTriangle, Filter, ChevronDown, ArrowLeft,
  ShieldAlert, CheckCircle2, Clock, User, Pill,
  FileText, CircleDot, Activity, ShieldCheck,
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
  `;
  document.head.appendChild(s);
}

/* severity config */
const SEV = {
  severe:   { gradient: "from-red-500 to-rose-600",   bg: "bg-red-500",    badgeL: "bg-red-100 text-red-700",    badgeD: "bg-red-900/50 text-red-300",    borderL: "border-red-400",    borderD: "border-red-700",    icon: ShieldAlert },
  moderate: { gradient: "from-amber-500 to-orange-500", bg: "bg-amber-500", badgeL: "bg-amber-100 text-amber-700", badgeD: "bg-amber-900/50 text-amber-300", borderL: "border-amber-400", borderD: "border-amber-700", icon: AlertTriangle },
  mild:     { gradient: "from-teal-500 to-emerald-500", bg: "bg-teal-500",  badgeL: "bg-teal-100 text-teal-700",   badgeD: "bg-teal-900/50 text-teal-300",   borderL: "border-teal-400",  borderD: "border-teal-700",  icon: Activity },
};

const PharmacyAdminAdverseReactions = ({ setIsAuthenticated }) => {
  const { t } = useLanguage();
  const { isDark } = useTheme();

  const [reactions, setReactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterResolved, setFilterResolved] = useState("all");

  /* ─── theme tokens ─── */
  const c = isDark
    ? {
        pageBg: "bg-gray-950", surfaceBg: "bg-gray-900", surfaceBorder: "border-gray-800",
        textH: "text-gray-100", textP: "text-gray-400", textMuted: "text-gray-500",
        inputBg: "bg-gray-800", inputBorder: "border-gray-700",
        cardHover: "hover:shadow-xl hover:border-gray-700",
        errorBg: "bg-red-900/30", errorBorder: "border-red-800", errorText: "text-red-300",
        divider: "border-gray-800",
      }
    : {
        pageBg: "bg-gray-50", surfaceBg: "bg-white", surfaceBorder: "border-gray-200",
        textH: "text-gray-900", textP: "text-gray-600", textMuted: "text-gray-400",
        inputBg: "bg-gray-100", inputBorder: "border-gray-300",
        cardHover: "hover:shadow-xl hover:border-gray-300",
        errorBg: "bg-red-50", errorBorder: "border-red-200", errorText: "text-red-700",
        divider: "border-gray-100",
      };

  /* ─── fetch ─── */
  useEffect(() => {
    const fetchReactions = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (filterSeverity !== "all") params.append("severity", filterSeverity);
        if (filterResolved !== "all") params.append("is_resolved", filterResolved === "resolved" ? "true" : "false");

        const response = await fetch(
          `${API_BASE_URL}/pharmacy-admin/adverse-reactions/?${params}`,
          { headers: { "Content-Type": "application/json", Authorization: `Token ${localStorage.getItem("access_token")}` } }
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
    fetchReactions();
  }, [filterSeverity, filterResolved]);

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

          {/* error */}
          {error && (
            <div className={`mb-6 rounded-xl border ${c.errorBorder} ${c.errorBg} p-4 pa-fade-up flex items-center gap-3`}>
              <CircleDot className="text-red-500 shrink-0" size={18} />
              <p className={`${c.errorText} text-sm`}>{error}</p>
            </div>
          )}

          {/* ─── FILTERS ─── */}
          <div className={`${c.surfaceBg} rounded-2xl border ${c.surfaceBorder} shadow-lg p-5 sm:p-6 mb-6 pa-fade-up`}>
            <div className="flex flex-col sm:flex-row gap-4">
              {/* severity */}
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

              {/* resolution */}
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
                const sev = SEV[rx.severity] || SEV.mild;
                const SevIcon = sev.icon;

                return (
                  <div
                    key={rx.id}
                    className={`${c.surfaceBg} rounded-2xl border ${c.surfaceBorder} shadow-lg
                                ${c.cardHover} transition-all duration-300 overflow-hidden pa-fade-up`}
                    style={{ animationDelay: `${0.06 * idx}s` }}
                  >
                    {/* colour accent strip */}
                    <div className={`h-1.5 bg-gradient-to-r ${sev.gradient}`} />

                    <div className="p-5 sm:p-6">
                      {/* top row: severity icon + badges */}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl ${sev.bg} bg-opacity-20 flex items-center justify-center`}>
                            <SevIcon size={20} className={`${sev.bg.replace("bg-","text-")}`} />
                          </div>
                          <div>
                            <h3 className={`font-semibold ${c.textH}`}>
                              {rx.patient_name || t("pharmacyAdminAdverseReactions.patient")}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Pill size={13} className={c.textMuted} />
                              <span className={`text-sm ${c.textP}`}>{rx.medicine_name || t("pharmacyAdminAdverseReactions.unknownMedicine")}</span>
                            </div>
                          </div>
                        </div>

                        {/* badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold
                                           ${isDark ? sev.badgeD : sev.badgeL}`}>
                            <SevIcon size={12} />
                            {rx.severity?.charAt(0).toUpperCase() + rx.severity?.slice(1) || t("common.unknown")}
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

                      {/* details grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                        <div className={`rounded-xl p-3 ${isDark ? "bg-gray-800/60" : "bg-gray-50"}`}>
                          <p className={`text-xs font-semibold uppercase tracking-wider ${c.textMuted} mb-1`}>
                            {t("pharmacyAdminAdverseReactions.reactionType")}
                          </p>
                          <p className={`text-sm ${c.textH} capitalize font-medium`}>{rx.reaction_type}</p>
                        </div>
                        <div className={`rounded-xl p-3 sm:col-span-2 ${isDark ? "bg-gray-800/60" : "bg-gray-50"}`}>
                          <p className={`text-xs font-semibold uppercase tracking-wider ${c.textMuted} mb-1`}>
                            {t("pharmacyAdminAdverseReactions.description")}
                          </p>
                          <p className={`text-sm ${c.textH} leading-relaxed`}>{rx.description || "—"}</p>
                        </div>
                      </div>

                      {/* footer: date + actions */}
                      <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3
                                       pt-4 border-t ${c.divider}`}>
                        <div className="flex items-center gap-1.5">
                          <Clock size={14} className={c.textMuted} />
                          <span className={`text-sm ${c.textP}`}>
                            {t("pharmacyAdminAdverseReactions.reported")}:{" "}
                            {rx.reported_date ? new Date(rx.reported_date).toLocaleDateString() : t("common.na")}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => alert(`View details for reaction ${rx.id}`)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold
                                       bg-teal-500/10 text-teal-600 dark:text-teal-400 hover:bg-teal-500/20
                                       transition-colors"
                          >
                            <FileText size={14} /> {t("pharmacyAdminAdverseReactions.viewDetails")}
                          </button>
                          {!rx.is_resolved && (
                            <button
                              onClick={() => alert(`Mark reaction ${rx.id} as resolved`)}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold
                                         bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20
                                         transition-colors"
                            >
                              <CheckCircle2 size={14} /> {t("pharmacyAdminAdverseReactions.markResolved")}
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
            /* ─── EMPTY ─── */
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
    </BaseLayout>
  );
};

export default PharmacyAdminAdverseReactions;
