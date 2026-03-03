import React, { useState, useEffect } from "react";
import {
  ArrowLeft, AlertTriangle, Users, Pill, Activity,
  TrendingUp, ShieldAlert, CheckCircle2, Clock,
  FileText, BarChart3, PieChart, User, Heart,
  Download, Printer, ChevronDown, X, Eye,
  AlertCircle, Calendar,
} from "lucide-react";
import { Link } from "react-router-dom";
import BaseLayout from "../components/BaseLayout";
import { useLanguage } from "../i18n";
import { useTheme } from "../contexts/ThemeContext";
import { API_BASE_URL } from "../services/api";

/* ───────── inline keyframes ───────── */
const STYLE_ID = "pa-rpt-anim";
if (typeof document !== "undefined" && !document.getElementById(STYLE_ID)) {
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
    @keyframes pa-fade-up { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
    .pa-fade-up { animation: pa-fade-up .45s ease both }
    @keyframes pa-count-pop { 0%{transform:scale(.7);opacity:0} 60%{transform:scale(1.08)} 100%{transform:scale(1);opacity:1} }
    .pa-count-pop { animation: pa-count-pop .55s cubic-bezier(.34,1.56,.64,1) both }
    @keyframes pa-bar-grow { from{width:0} to{width:var(--bar-w)} }
    .pa-bar-grow { animation: pa-bar-grow .7s ease both }
  `;
  document.head.appendChild(s);
}

/* ─── severity color map ─── */
const SEV_COLORS = {
  mild:             { bar: "bg-teal-500",   badge: "bg-teal-100 text-teal-700",   badgeDark: "bg-teal-900/50 text-teal-300" },
  moderate:         { bar: "bg-amber-500",  badge: "bg-amber-100 text-amber-700", badgeDark: "bg-amber-900/50 text-amber-300" },
  severe:           { bar: "bg-red-500",    badge: "bg-red-100 text-red-700",     badgeDark: "bg-red-900/50 text-red-300" },
  life_threatening: { bar: "bg-red-700",    badge: "bg-red-200 text-red-800",     badgeDark: "bg-red-900/60 text-red-200" },
};

const TYPE_LABELS = {
  allergic: "Allergic Reaction",
  side_effect: "Side Effect",
  adverse_event: "Adverse Event",
  medication_error: "Medication Error",
  other: "Other",
};

const PharmacyAdminReports = ({ setIsAuthenticated }) => {
  const { t } = useLanguage();
  const { isDark } = useTheme();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  const token = localStorage.getItem("access_token");
  const headers = { "Content-Type": "application/json", Authorization: `Token ${token}` };

  /* ─── theme tokens ─── */
  const c = isDark
    ? {
        pageBg: "bg-gray-950", surfaceBg: "bg-gray-900", surfaceBorder: "border-gray-800",
        textH: "text-gray-100", textP: "text-gray-400", textMuted: "text-gray-500",
        inputBg: "bg-gray-800", inputBorder: "border-gray-700",
        errorBg: "bg-red-900/30", errorBorder: "border-red-800", errorText: "text-red-300",
        rowHover: "hover:bg-gray-800/60", headBg: "bg-gray-800/60",
        barTrack: "bg-gray-800", cardGlow: "",
      }
    : {
        pageBg: "bg-gray-50", surfaceBg: "bg-white", surfaceBorder: "border-gray-200",
        textH: "text-gray-900", textP: "text-gray-600", textMuted: "text-gray-400",
        inputBg: "bg-gray-100", inputBorder: "border-gray-300",
        errorBg: "bg-red-50", errorBorder: "border-red-200", errorText: "text-red-700",
        rowHover: "hover:bg-gray-50", headBg: "bg-gray-50",
        barTrack: "bg-gray-200", cardGlow: "",
      };

  /* ─── fetch ─── */
  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE_URL}/pharmacy-admin/reports/`, { headers });
        if (!res.ok) throw new Error("Failed to fetch reports data");
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to load reports");
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─── print handler ─── */
  const handlePrint = () => window.print();

  /* helper: bar width percent */
  const pct = (val, max) => (max > 0 ? Math.round((val / max) * 100) : 0);

  /* ═══════════════════ RENDER ═══════════════════ */
  return (
    <BaseLayout showNavigation setIsAuthenticated={setIsAuthenticated}>
      <div className={`min-h-screen ${c.pageBg} pb-12`}>
        {/* ── header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pa-fade-up">
          <div className="flex items-center gap-3">
            <Link to="/pharmacy-admin/dashboard"
              className={`p-2 rounded-xl ${c.surfaceBg} border ${c.surfaceBorder} ${c.textP}
                          hover:text-teal-500 transition-colors`}>
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className={`text-2xl font-bold ${c.textH} flex items-center gap-2`}>
                <BarChart3 className="text-teal-500" size={26} />
                {t("pharmacyAdminReports.title") || "Reports & Analytics"}
              </h1>
              <p className={`text-sm ${c.textP} mt-0.5`}>
                {t("pharmacyAdminReports.subtitle") || "Comprehensive insights for your pharmacy"}
              </p>
            </div>
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500
                       text-white font-medium hover:from-teal-600 hover:to-emerald-600 transition-all shadow-sm
                       hover:shadow-md active:scale-[0.97] print:hidden"
          >
            <Printer size={16} />
            {t("pharmacyAdminReports.print") || "Print Report"}
          </button>
        </div>

        {/* ── loading ── */}
        {loading && (
          <div className="flex items-center justify-center py-32">
            <div className="w-12 h-12 border-4 border-transparent border-t-teal-500 rounded-full animate-spin" />
          </div>
        )}

        {/* ── error ── */}
        {error && !loading && (
          <div className={`rounded-2xl border ${c.errorBorder} ${c.errorBg} p-5 flex items-center gap-3 pa-fade-up`}>
            <AlertCircle className="text-red-500 shrink-0" size={20} />
            <p className={`${c.errorText} text-sm`}>{error}</p>
          </div>
        )}

        {/* ── content ── */}
        {data && !loading && (
          <>
            {/* TAB BAR */}
            <div className={`flex gap-1 p-1 rounded-2xl ${c.surfaceBg} border ${c.surfaceBorder} mb-6 pa-fade-up
                             overflow-x-auto print:hidden`}>
              {[
                { key: "overview",  icon: PieChart,      label: t("pharmacyAdminReports.tabOverview") || "Overview" },
                { key: "reactions", icon: AlertTriangle,  label: t("pharmacyAdminReports.tabReactions") || "Side Effects" },
                { key: "patients",  icon: Users,          label: t("pharmacyAdminReports.tabPatients") || "Patients" },
                { key: "medicines", icon: Pill,           label: t("pharmacyAdminReports.tabMedicines") || "Medications" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold flex-1 justify-center
                              transition-all whitespace-nowrap
                              ${activeTab === tab.key
                                ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-md"
                                : `${c.textP} hover:${isDark ? "bg-gray-800" : "bg-gray-100"}`}`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ══════════ OVERVIEW TAB ══════════ */}
            {(activeTab === "overview" || typeof window !== "undefined" && window.matchMedia("print").matches) && (
              <div className="space-y-6">
                {/* KPI Row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: t("pharmacyAdminReports.totalPatients") || "Total Patients",
                      value: data.patients.total, icon: Users, color: "from-blue-500 to-indigo-500",
                      bg: isDark ? "bg-blue-900/20" : "bg-blue-50" },
                    { label: t("pharmacyAdminReports.activePatients") || "Active Patients",
                      value: data.patients.active, icon: Heart, color: "from-emerald-500 to-teal-500",
                      bg: isDark ? "bg-emerald-900/20" : "bg-emerald-50" },
                    { label: t("pharmacyAdminReports.totalReactions") || "Total Side Effects",
                      value: data.adverse_reactions.total, icon: AlertTriangle, color: "from-amber-500 to-orange-500",
                      bg: isDark ? "bg-amber-900/20" : "bg-amber-50" },
                    { label: t("pharmacyAdminReports.unresolvedReactions") || "Unresolved",
                      value: data.adverse_reactions.unresolved, icon: ShieldAlert, color: "from-red-500 to-rose-500",
                      bg: isDark ? "bg-red-900/20" : "bg-red-50" },
                  ].map((kpi, i) => (
                    <div key={i}
                      className={`rounded-2xl border ${c.surfaceBorder} ${c.surfaceBg} p-5 pa-fade-up shadow-sm`}
                      style={{ animationDelay: `${i * 80}ms` }}>
                      <div className={`w-11 h-11 rounded-xl ${kpi.bg} flex items-center justify-center mb-3`}>
                        <kpi.icon size={22} className={`bg-gradient-to-r ${kpi.color} bg-clip-text`}
                          style={{ color: kpi.color.includes("blue") ? "#3b82f6"
                            : kpi.color.includes("emerald") ? "#10b981"
                            : kpi.color.includes("amber") ? "#f59e0b" : "#ef4444" }}
                        />
                      </div>
                      <p className={`text-3xl font-bold ${c.textH} pa-count-pop`} style={{ animationDelay: `${i * 80 + 200}ms` }}>
                        {kpi.value}
                      </p>
                      <p className={`text-xs ${c.textMuted} mt-1 font-medium`}>{kpi.label}</p>
                    </div>
                  ))}
                </div>

                {/* two-column: severity breakdown + resolution status */}
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Severity Breakdown */}
                  <div className={`rounded-2xl border ${c.surfaceBorder} ${c.surfaceBg} p-5 pa-fade-up`}
                    style={{ animationDelay: "300ms" }}>
                    <h3 className={`text-sm font-bold ${c.textH} mb-4 flex items-center gap-2`}>
                      <AlertTriangle size={16} className="text-amber-500" />
                      {t("pharmacyAdminReports.severityBreakdown") || "Severity Breakdown"}
                    </h3>
                    {["mild", "moderate", "severe", "life_threatening"].map((sev) => {
                      const cnt = data.adverse_reactions.by_severity[sev] || 0;
                      const w = pct(cnt, data.adverse_reactions.total);
                      const colors = SEV_COLORS[sev];
                      return (
                        <div key={sev} className="mb-3 last:mb-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs font-semibold capitalize ${c.textP}`}>
                              {sev.replace("_", " ")}
                            </span>
                            <span className={`text-xs font-bold ${c.textH}`}>{cnt}</span>
                          </div>
                          <div className={`h-2.5 rounded-full ${c.barTrack} overflow-hidden`}>
                            <div className={`h-full rounded-full ${colors.bar} pa-bar-grow`}
                              style={{ "--bar-w": `${Math.max(w, cnt > 0 ? 4 : 0)}%`, width: `${Math.max(w, cnt > 0 ? 4 : 0)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Resolution Status */}
                  <div className={`rounded-2xl border ${c.surfaceBorder} ${c.surfaceBg} p-5 pa-fade-up`}
                    style={{ animationDelay: "380ms" }}>
                    <h3 className={`text-sm font-bold ${c.textH} mb-4 flex items-center gap-2`}>
                      <CheckCircle2 size={16} className="text-emerald-500" />
                      {t("pharmacyAdminReports.resolutionStatus") || "Resolution Status"}
                    </h3>
                    <div className="space-y-4">
                      {[
                        { label: t("pharmacyAdminReports.resolved") || "Resolved", value: data.adverse_reactions.resolved,
                          color: "bg-emerald-500", track: isDark ? "bg-emerald-900/30" : "bg-emerald-50" },
                        { label: t("pharmacyAdminReports.unresolved") || "Unresolved", value: data.adverse_reactions.unresolved,
                          color: "bg-red-500", track: isDark ? "bg-red-900/30" : "bg-red-50" },
                        { label: t("pharmacyAdminReports.followUpNeeded") || "Follow-up Needed", value: data.adverse_reactions.follow_up_needed,
                          color: "bg-amber-500", track: isDark ? "bg-amber-900/30" : "bg-amber-50" },
                      ].map((item, i) => (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className={`text-xs font-semibold ${c.textP}`}>{item.label}</span>
                            <span className={`text-xs font-bold ${c.textH}`}>{item.value}</span>
                          </div>
                          <div className={`h-2.5 rounded-full ${c.barTrack} overflow-hidden`}>
                            <div className={`h-full rounded-full ${item.color} pa-bar-grow`}
                              style={{ "--bar-w": `${Math.max(pct(item.value, data.adverse_reactions.total), item.value > 0 ? 4 : 0)}%`,
                                       width: `${Math.max(pct(item.value, data.adverse_reactions.total), item.value > 0 ? 4 : 0)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* quick stats */}
                    <div className="grid grid-cols-2 gap-3 mt-5 pt-4 border-t border-dashed" style={{ borderColor: isDark ? "#374151" : "#e5e7eb" }}>
                      <div className="text-center">
                        <p className={`text-xl font-bold ${c.textH}`}>{data.medications.total}</p>
                        <p className={`text-[10px] font-semibold uppercase ${c.textMuted}`}>
                          {t("pharmacyAdminReports.totalMedications") || "Total Medications"}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className={`text-xl font-bold ${c.textH}`}>{data.patients.with_consent}</p>
                        <p className={`text-[10px] font-semibold uppercase ${c.textMuted}`}>
                          {t("pharmacyAdminReports.withConsent") || "With Consent"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Monthly Trend */}
                <div className={`rounded-2xl border ${c.surfaceBorder} ${c.surfaceBg} p-5 pa-fade-up`}
                  style={{ animationDelay: "460ms" }}>
                  <h3 className={`text-sm font-bold ${c.textH} mb-4 flex items-center gap-2`}>
                    <TrendingUp size={16} className="text-indigo-500" />
                    {t("pharmacyAdminReports.monthlyTrend") || "Monthly Side Effects Trend"}
                  </h3>
                  <div className="flex items-end gap-1.5 h-40">
                    {data.adverse_reactions.monthly_trend.map((m, i) => {
                      const maxCnt = Math.max(...data.adverse_reactions.monthly_trend.map(x => x.count), 1);
                      const h = Math.max((m.count / maxCnt) * 100, m.count > 0 ? 6 : 2);
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group">
                          <span className={`text-[9px] font-bold ${c.textH} opacity-0 group-hover:opacity-100 transition-opacity mb-1`}>
                            {m.count}
                          </span>
                          <div
                            className={`w-full rounded-t-md bg-gradient-to-t from-teal-500 to-emerald-400
                                        transition-all group-hover:from-teal-400 group-hover:to-emerald-300`}
                            style={{ height: `${h}%` }}
                            title={`${m.month}: ${m.count}`}
                          />
                          <span className={`text-[8px] ${c.textMuted} mt-1.5 truncate w-full text-center font-medium`}>
                            {m.month.split(" ")[0]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ══════════ REACTIONS TAB ══════════ */}
            {activeTab === "reactions" && (
              <div className="space-y-6 pa-fade-up">
                {/* type breakdown */}
                <div className={`rounded-2xl border ${c.surfaceBorder} ${c.surfaceBg} p-5`}>
                  <h3 className={`text-sm font-bold ${c.textH} mb-4 flex items-center gap-2`}>
                    <Activity size={16} className="text-indigo-500" />
                    {t("pharmacyAdminReports.byReactionType") || "By Reaction Type"}
                  </h3>
                  {Object.entries(data.adverse_reactions.by_type).map(([type, cnt]) => {
                    const w = pct(cnt, data.adverse_reactions.total);
                    return (
                      <div key={type} className="mb-3 last:mb-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-semibold ${c.textP}`}>{TYPE_LABELS[type] || type}</span>
                          <span className={`text-xs font-bold ${c.textH}`}>{cnt}</span>
                        </div>
                        <div className={`h-2.5 rounded-full ${c.barTrack} overflow-hidden`}>
                          <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 pa-bar-grow"
                            style={{ "--bar-w": `${Math.max(w, cnt > 0 ? 4 : 0)}%`, width: `${Math.max(w, cnt > 0 ? 4 : 0)}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* outcome breakdown */}
                <div className={`rounded-2xl border ${c.surfaceBorder} ${c.surfaceBg} p-5`}>
                  <h3 className={`text-sm font-bold ${c.textH} mb-4 flex items-center gap-2`}>
                    <Heart size={16} className="text-rose-500" />
                    {t("pharmacyAdminReports.byOutcome") || "By Outcome"}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {Object.entries(data.adverse_reactions.by_outcome).map(([outcome, cnt]) => (
                      <div key={outcome}
                        className={`rounded-xl p-3 text-center ${isDark ? "bg-gray-800/60" : "bg-gray-50"} border ${c.surfaceBorder}`}>
                        <p className={`text-xl font-bold ${c.textH}`}>{cnt}</p>
                        <p className={`text-[10px] font-semibold uppercase ${c.textMuted} mt-0.5`}>
                          {outcome.replace(/_/g, " ")}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* top medications with reactions */}
                <div className={`rounded-2xl border ${c.surfaceBorder} ${c.surfaceBg} p-5`}>
                  <h3 className={`text-sm font-bold ${c.textH} mb-4 flex items-center gap-2`}>
                    <Pill size={16} className="text-amber-500" />
                    {t("pharmacyAdminReports.topMedsReactions") || "Top Medications with Side Effects"}
                  </h3>
                  {data.adverse_reactions.top_medications.length === 0 ? (
                    <p className={`text-sm ${c.textMuted} text-center py-4`}>
                      {t("pharmacyAdminReports.noData") || "No data available"}
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {data.adverse_reactions.top_medications.map((med, i) => {
                        const maxMed = data.adverse_reactions.top_medications[0]?.count || 1;
                        const w = pct(med.count, maxMed);
                        return (
                          <div key={i}>
                            <div className="flex items-center justify-between mb-1">
                              <span className={`text-xs font-semibold ${c.textP} truncate max-w-[70%]`}>{med.medication_name}</span>
                              <span className={`text-xs font-bold ${c.textH}`}>{med.count}</span>
                            </div>
                            <div className={`h-2 rounded-full ${c.barTrack} overflow-hidden`}>
                              <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 pa-bar-grow"
                                style={{ "--bar-w": `${Math.max(w, 6)}%`, width: `${Math.max(w, 6)}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Recent side effects table */}
                <div className={`rounded-2xl border ${c.surfaceBorder} ${c.surfaceBg} overflow-hidden`}>
                  <div className="p-5 pb-3">
                    <h3 className={`text-sm font-bold ${c.textH} flex items-center gap-2`}>
                      <Clock size={16} className="text-teal-500" />
                      {t("pharmacyAdminReports.recentReactions") || "Recent Adverse Reactions"}
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className={c.headBg}>
                          <th className={`px-4 py-2.5 text-left font-semibold ${c.textMuted} uppercase tracking-wider`}>
                            {t("pharmacyAdminReports.patient") || "Patient"}
                          </th>
                          <th className={`px-4 py-2.5 text-left font-semibold ${c.textMuted} uppercase tracking-wider`}>
                            {t("pharmacyAdminReports.medication") || "Medication"}
                          </th>
                          <th className={`px-4 py-2.5 text-left font-semibold ${c.textMuted} uppercase tracking-wider`}>
                            {t("pharmacyAdminReports.severity") || "Severity"}
                          </th>
                          <th className={`px-4 py-2.5 text-left font-semibold ${c.textMuted} uppercase tracking-wider`}>
                            {t("pharmacyAdminReports.status") || "Status"}
                          </th>
                          <th className={`px-4 py-2.5 text-left font-semibold ${c.textMuted} uppercase tracking-wider`}>
                            {t("pharmacyAdminReports.date") || "Date"}
                          </th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isDark ? "divide-gray-800" : "divide-gray-100"}`}>
                        {data.adverse_reactions.recent.map((rx) => {
                          const sevColors = SEV_COLORS[rx.severity] || SEV_COLORS.mild;
                          return (
                            <tr key={rx.id} className={c.rowHover}>
                              <td className={`px-4 py-3 font-medium ${c.textH}`}>{rx.patient_name}</td>
                              <td className={`px-4 py-3 ${c.textP}`}>{rx.medication_name}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold
                                                 ${isDark ? sevColors.badgeDark : sevColors.badge}`}>
                                  {rx.severity.replace("_", " ")}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold
                                                 ${rx.is_resolved
                                                   ? (isDark ? "bg-emerald-900/50 text-emerald-300" : "bg-emerald-100 text-emerald-700")
                                                   : (isDark ? "bg-red-900/40 text-red-300" : "bg-red-100 text-red-700")}`}>
                                  {rx.is_resolved ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                                  {rx.is_resolved
                                    ? (t("pharmacyAdminReports.resolved") || "Resolved")
                                    : (t("pharmacyAdminReports.unresolved") || "Unresolved")}
                                </span>
                              </td>
                              <td className={`px-4 py-3 ${c.textMuted}`}>
                                {rx.reported_date ? new Date(rx.reported_date).toLocaleDateString() : "—"}
                              </td>
                            </tr>
                          );
                        })}
                        {data.adverse_reactions.recent.length === 0 && (
                          <tr>
                            <td colSpan={5} className={`px-4 py-8 text-center ${c.textMuted}`}>
                              {t("pharmacyAdminReports.noData") || "No data available"}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ══════════ PATIENTS TAB ══════════ */}
            {activeTab === "patients" && (
              <div className="space-y-6 pa-fade-up">
                {/* distribution */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: t("pharmacyAdminReports.totalPatients") || "Total", value: data.patients.total,
                      icon: Users, iconColor: "text-blue-500", bg: isDark ? "bg-blue-900/20" : "bg-blue-50" },
                    { label: t("pharmacyAdminReports.activePatients") || "Active", value: data.patients.active,
                      icon: Heart, iconColor: "text-emerald-500", bg: isDark ? "bg-emerald-900/20" : "bg-emerald-50" },
                    { label: t("pharmacyAdminReports.inactivePatients") || "Inactive", value: data.patients.inactive,
                      icon: User, iconColor: "text-gray-500", bg: isDark ? "bg-gray-800" : "bg-gray-100" },
                    { label: t("pharmacyAdminReports.withConsent") || "With Consent", value: data.patients.with_consent,
                      icon: CheckCircle2, iconColor: "text-teal-500", bg: isDark ? "bg-teal-900/20" : "bg-teal-50" },
                  ].map((stat, i) => (
                    <div key={i} className={`rounded-2xl border ${c.surfaceBorder} ${c.surfaceBg} p-5`}>
                      <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                        <stat.icon size={20} className={stat.iconColor} />
                      </div>
                      <p className={`text-2xl font-bold ${c.textH}`}>{stat.value}</p>
                      <p className={`text-xs ${c.textMuted} mt-0.5 font-medium`}>{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* top patients by reactions */}
                <div className={`rounded-2xl border ${c.surfaceBorder} ${c.surfaceBg} p-5`}>
                  <h3 className={`text-sm font-bold ${c.textH} mb-4 flex items-center gap-2`}>
                    <AlertTriangle size={16} className="text-amber-500" />
                    {t("pharmacyAdminReports.patientsByReactions") || "Patients with Most Side Effects"}
                  </h3>
                  {data.patients.top_by_reactions.length === 0 ? (
                    <p className={`text-sm ${c.textMuted} text-center py-4`}>
                      {t("pharmacyAdminReports.noData") || "No data available"}
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {data.patients.top_by_reactions.map((p, i) => {
                        const maxR = data.patients.top_by_reactions[0]?.reaction_count || 1;
                        const w = pct(p.reaction_count, maxR);
                        return (
                          <div key={i}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2 max-w-[70%]">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white
                                                bg-gradient-to-br from-teal-500 to-emerald-500 shrink-0`}>
                                  {p.full_name?.charAt(0)?.toUpperCase() || "?"}
                                </div>
                                <span className={`text-xs font-semibold ${c.textH} truncate`}>{p.full_name}</span>
                              </div>
                              <span className={`text-xs font-bold ${c.textH}`}>{p.reaction_count}</span>
                            </div>
                            <div className={`h-2 rounded-full ${c.barTrack} overflow-hidden`}>
                              <div className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-400 pa-bar-grow"
                                style={{ "--bar-w": `${Math.max(w, 8)}%`, width: `${Math.max(w, 8)}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* top patients by medicine count */}
                <div className={`rounded-2xl border ${c.surfaceBorder} ${c.surfaceBg} p-5`}>
                  <h3 className={`text-sm font-bold ${c.textH} mb-4 flex items-center gap-2`}>
                    <Pill size={16} className="text-emerald-500" />
                    {t("pharmacyAdminReports.patientsByMedicines") || "Patients with Most Medications"}
                  </h3>
                  {data.patients.top_by_medicines.length === 0 ? (
                    <p className={`text-sm ${c.textMuted} text-center py-4`}>
                      {t("pharmacyAdminReports.noData") || "No data available"}
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {data.patients.top_by_medicines.map((p, i) => {
                        const maxM = data.patients.top_by_medicines[0]?.medicine_count || 1;
                        const w = pct(p.medicine_count, maxM);
                        return (
                          <div key={i}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2 max-w-[70%]">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white
                                                bg-gradient-to-br from-emerald-500 to-green-500 shrink-0`}>
                                  {p.full_name?.charAt(0)?.toUpperCase() || "?"}
                                </div>
                                <span className={`text-xs font-semibold ${c.textH} truncate`}>{p.full_name}</span>
                              </div>
                              <span className={`text-xs font-bold ${c.textH}`}>{p.medicine_count}</span>
                            </div>
                            <div className={`h-2 rounded-full ${c.barTrack} overflow-hidden`}>
                              <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 pa-bar-grow"
                                style={{ "--bar-w": `${Math.max(w, 8)}%`, width: `${Math.max(w, 8)}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══════════ MEDICATIONS TAB ══════════ */}
            {activeTab === "medicines" && (
              <div className="space-y-6 pa-fade-up">
                {/* medication KPIs */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: t("pharmacyAdminReports.totalMedications") || "Total", value: data.medications.total,
                      icon: Pill, color: "text-indigo-500", bg: isDark ? "bg-indigo-900/20" : "bg-indigo-50" },
                    { label: t("pharmacyAdminReports.activeMedications") || "Active", value: data.medications.active,
                      icon: CheckCircle2, color: "text-emerald-500", bg: isDark ? "bg-emerald-900/20" : "bg-emerald-50" },
                    { label: t("pharmacyAdminReports.inactiveMedications") || "Inactive", value: data.medications.inactive,
                      icon: Clock, color: "text-gray-500", bg: isDark ? "bg-gray-800" : "bg-gray-100" },
                  ].map((stat, i) => (
                    <div key={i} className={`rounded-2xl border ${c.surfaceBorder} ${c.surfaceBg} p-5`}>
                      <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
                        <stat.icon size={20} className={stat.color} />
                      </div>
                      <p className={`text-2xl font-bold ${c.textH}`}>{stat.value}</p>
                      <p className={`text-xs ${c.textMuted} mt-0.5 font-medium`}>{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* most prescribed medications */}
                <div className={`rounded-2xl border ${c.surfaceBorder} ${c.surfaceBg} p-5`}>
                  <h3 className={`text-sm font-bold ${c.textH} mb-4 flex items-center gap-2`}>
                    <BarChart3 size={16} className="text-indigo-500" />
                    {t("pharmacyAdminReports.topPrescribed") || "Most Common Medications"}
                  </h3>
                  {data.medications.top_prescribed.length === 0 ? (
                    <p className={`text-sm ${c.textMuted} text-center py-4`}>
                      {t("pharmacyAdminReports.noData") || "No data available"}
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {data.medications.top_prescribed.map((med, i) => {
                        const maxP = data.medications.top_prescribed[0]?.count || 1;
                        const w = pct(med.count, maxP);
                        return (
                          <div key={i}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2 max-w-[70%]">
                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0
                                                ${isDark ? "bg-indigo-900/40" : "bg-indigo-50"}`}>
                                  <Pill size={12} className="text-indigo-500" />
                                </div>
                                <span className={`text-xs font-semibold ${c.textH} truncate`}>{med.name}</span>
                              </div>
                              <span className={`text-xs font-bold ${c.textH}`}>
                                {med.count} {med.count === 1
                                  ? (t("pharmacyAdminReports.patient") || "patient")
                                  : (t("pharmacyAdminReports.patients") || "patients")}
                              </span>
                            </div>
                            <div className={`h-2 rounded-full ${c.barTrack} overflow-hidden`}>
                              <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-400 pa-bar-grow"
                                style={{ "--bar-w": `${Math.max(w, 8)}%`, width: `${Math.max(w, 8)}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* quick overview card */}
                <div className={`rounded-2xl border ${c.surfaceBorder} overflow-hidden`}>
                  <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-5">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <FileText size={16} />
                      {t("pharmacyAdminReports.medicationSummary") || "Medication Summary"}
                    </h3>
                  </div>
                  <div className={`p-5 ${c.surfaceBg}`}>
                    <div className="grid grid-cols-2 gap-4">
                      <div className={`rounded-xl p-4 text-center ${isDark ? "bg-gray-800/60" : "bg-gray-50"}`}>
                        <p className={`text-3xl font-bold ${c.textH}`}>
                          {data.medications.total > 0
                            ? (data.medications.active / data.medications.total * 100).toFixed(0)
                            : 0}%
                        </p>
                        <p className={`text-[10px] font-semibold uppercase ${c.textMuted} mt-1`}>
                          {t("pharmacyAdminReports.activeRate") || "Active Rate"}
                        </p>
                      </div>
                      <div className={`rounded-xl p-4 text-center ${isDark ? "bg-gray-800/60" : "bg-gray-50"}`}>
                        <p className={`text-3xl font-bold ${c.textH}`}>
                          {data.patients.total > 0
                            ? (data.medications.total / data.patients.total).toFixed(1)
                            : 0}
                        </p>
                        <p className={`text-[10px] font-semibold uppercase ${c.textMuted} mt-1`}>
                          {t("pharmacyAdminReports.avgPerPatient") || "Avg per Patient"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* generated timestamp */}
            <p className={`text-center text-[10px] ${c.textMuted} mt-8 font-medium`}>
              {t("pharmacyAdminReports.generatedAt") || "Report generated at"}{" "}
              {data.generated_at ? new Date(data.generated_at).toLocaleString() : "—"}
            </p>
          </>
        )}
      </div>
    </BaseLayout>
  );
};

export default PharmacyAdminReports;
