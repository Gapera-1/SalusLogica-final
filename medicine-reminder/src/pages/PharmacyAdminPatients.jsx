import React, { useState, useEffect } from "react";
import {
  Search, Filter, Users, UserCheck, UserX, Eye, Pill,
  ArrowLeft, ChevronDown, Mail, Calendar, CircleDot,
} from "lucide-react";
import { Link } from "react-router-dom";
import BaseLayout from "../components/BaseLayout";
import { useLanguage } from "../i18n";
import { useTheme } from "../contexts/ThemeContext";
import { API_BASE_URL } from "../services/api";

/* ───────── inline keyframes ───────── */
const STYLE_ID = "pa-pts-anim";
if (typeof document !== "undefined" && !document.getElementById(STYLE_ID)) {
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
    @keyframes pa-fade-up { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
    .pa-fade-up { animation: pa-fade-up .45s ease both }
  `;
  document.head.appendChild(s);
}

const PharmacyAdminPatients = ({ setIsAuthenticated }) => {
  const { t } = useLanguage();
  const { isDark } = useTheme();

  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState("all");

  /* ─── theme tokens ─── */
  const c = isDark
    ? {
        pageBg: "bg-gray-950", surfaceBg: "bg-gray-900", surfaceBorder: "border-gray-800",
        textH: "text-gray-100", textP: "text-gray-400", textMuted: "text-gray-500",
        inputBg: "bg-gray-800", inputBorder: "border-gray-700",
        rowHover: "hover:bg-gray-800/60", headBg: "bg-gray-800/60",
        errorBg: "bg-red-900/30", errorBorder: "border-red-800", errorText: "text-red-300",
        badge: { active: "bg-emerald-900/50 text-emerald-300", inactive: "bg-red-900/40 text-red-300" },
      }
    : {
        pageBg: "bg-gray-50", surfaceBg: "bg-white", surfaceBorder: "border-gray-200",
        textH: "text-gray-900", textP: "text-gray-600", textMuted: "text-gray-400",
        inputBg: "bg-gray-100", inputBorder: "border-gray-300",
        rowHover: "hover:bg-gray-50", headBg: "bg-gray-50",
        errorBg: "bg-red-50", errorBorder: "border-red-200", errorText: "text-red-700",
        badge: { active: "bg-emerald-100 text-emerald-700", inactive: "bg-red-100 text-red-700" },
      };

  /* ─── fetch ─── */
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (filterActive !== "all") params.append("is_active", filterActive === "active" ? "true" : "false");

        const response = await fetch(
          `${API_BASE_URL}/pharmacy-admin/patients/?${params}`,
          { headers: { "Content-Type": "application/json", Authorization: `Token ${localStorage.getItem("access_token")}` } }
        );
        if (!response.ok) throw new Error("Failed to fetch patients");
        const data = await response.json();
        setPatients(Array.isArray(data) ? data : data.results || []);
      } catch (err) {
        console.error("Error fetching patients:", err);
        setError(err.message || "Failed to load patients");
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, [filterActive]);

  const filteredPatients = patients.filter(
    (p) =>
      p.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.email && p.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
            <p className={`${c.textP} font-medium`}>{t("pharmacyAdminPatients.loading")}</p>
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
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-500 to-purple-500" />
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
                  <Users className="text-white" size={24} />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-white">
                    {t("pharmacyAdminPatients.title")}
                  </h1>
                  <p className="text-blue-100 text-sm mt-0.5">{t("pharmacyAdminPatients.subtitle")}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── MAIN CONTENT ─── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-10">

          {/* error banner */}
          {error && (
            <div className={`mb-6 rounded-xl border ${c.errorBorder} ${c.errorBg} p-4 pa-fade-up flex items-center gap-3`}>
              <CircleDot className="text-red-500 shrink-0" size={18} />
              <p className={`${c.errorText} text-sm`}>{error}</p>
            </div>
          )}

          {/* ─── SEARCH & FILTER BAR ─── */}
          <div className={`${c.surfaceBg} rounded-2xl border ${c.surfaceBorder} shadow-lg p-5 sm:p-6 mb-6 pa-fade-up`}>
            <div className="flex flex-col sm:flex-row gap-4">
              {/* search */}
              <div className="flex-1 relative">
                <Search size={18} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${c.textMuted}`} />
                <input
                  type="text"
                  placeholder={t("pharmacyAdminPatients.searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl ${c.inputBg} border ${c.inputBorder}
                              ${c.textH} placeholder:${c.textMuted}
                              focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500
                              transition-all text-sm`}
                />
              </div>
              {/* filter */}
              <div className="relative sm:w-52">
                <Filter size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${c.textMuted}`} />
                <select
                  value={filterActive}
                  onChange={(e) => setFilterActive(e.target.value)}
                  className={`w-full appearance-none pl-9 pr-9 py-2.5 rounded-xl ${c.inputBg} border ${c.inputBorder}
                              ${c.textH} focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500
                              transition-all text-sm cursor-pointer`}
                >
                  <option value="all">{t("pharmacyAdminPatients.allPatients")}</option>
                  <option value="active">{t("pharmacyAdminPatients.active")}</option>
                  <option value="inactive">{t("pharmacyAdminPatients.inactive")}</option>
                </select>
                <ChevronDown size={16} className={`absolute right-3 top-1/2 -translate-y-1/2 ${c.textMuted} pointer-events-none`} />
              </div>
            </div>
          </div>

          {/* ─── PATIENTS TABLE / LIST ─── */}
          {filteredPatients.length > 0 ? (
            <div className={`${c.surfaceBg} rounded-2xl border ${c.surfaceBorder} shadow-lg overflow-hidden pa-fade-up`}
                 style={{ animationDelay: ".1s" }}>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className={c.headBg}>
                      {[
                        t("pharmacyAdminPatients.username"),
                        t("pharmacyAdminPatients.email"),
                        t("pharmacyAdminPatients.status"),
                        t("pharmacyAdminPatients.joinedDate"),
                        t("pharmacyAdminPatients.actions"),
                      ].map((h, i) => (
                        <th
                          key={i}
                          className={`px-6 py-3.5 text-left text-xs font-semibold uppercase tracking-wider ${c.textMuted}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? "divide-gray-800" : "divide-gray-100"}`}>
                    {filteredPatients.map((patient, idx) => (
                      <tr
                        key={patient.id}
                        className={`${c.rowHover} transition-colors pa-fade-up`}
                        style={{ animationDelay: `${0.05 * idx}s` }}
                      >
                        {/* username + avatar */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500
                                            flex items-center justify-center text-white text-sm font-bold shrink-0">
                              {patient.username?.charAt(0)?.toUpperCase() || "?"}
                            </div>
                            <span className={`text-sm font-semibold ${c.textH}`}>{patient.username}</span>
                          </div>
                        </td>
                        {/* email */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Mail size={14} className={c.textMuted} />
                            <span className={`text-sm ${c.textP}`}>{patient.email || "—"}</span>
                          </div>
                        </td>
                        {/* status */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold
                                           ${patient.is_active ? c.badge.active : c.badge.inactive}`}>
                            {patient.is_active
                              ? <><UserCheck size={12} /> {t("pharmacyAdminPatients.active")}</>
                              : <><UserX size={12} /> {t("pharmacyAdminPatients.inactive")}</>}
                          </span>
                        </td>
                        {/* joined */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar size={14} className={c.textMuted} />
                            <span className={`text-sm ${c.textP}`}>
                              {patient.date_joined ? new Date(patient.date_joined).toLocaleDateString() : t("common.na")}
                            </span>
                          </div>
                        </td>
                        {/* actions */}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => alert(`View details for ${patient.username}`)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium
                                         bg-teal-500/10 text-teal-600 dark:text-teal-400 hover:bg-teal-500/20 transition-colors"
                            >
                              <Eye size={13} /> {t("pharmacyAdminPatients.view")}
                            </button>
                            <button
                              onClick={() => alert(`View medicines for ${patient.username}`)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium
                                         bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                            >
                              <Pill size={13} /> {t("pharmacyAdminPatients.medicines")}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* footer */}
              <div className={`px-6 py-4 border-t ${isDark ? "border-gray-800 bg-gray-900/60" : "border-gray-100 bg-gray-50/60"}`}>
                <p className={`text-sm ${c.textP}`}>
                  {t("pharmacyAdminPatients.showing")}{" "}
                  <span className="font-semibold">{filteredPatients.length}</span>{" "}
                  {t("pharmacyAdminPatients.of")}{" "}
                  <span className="font-semibold">{patients.length}</span>{" "}
                  {t("pharmacyAdminPatients.patients")}
                </p>
              </div>
            </div>
          ) : (
            /* ─── EMPTY STATE ─── */
            <div className={`${c.surfaceBg} rounded-2xl border ${c.surfaceBorder} shadow-lg p-12 text-center pa-fade-up`}>
              <div className={`mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4
                              ${isDark ? "bg-gray-800" : "bg-gray-100"}`}>
                <Users size={28} className={c.textMuted} />
              </div>
              <h3 className={`text-lg font-semibold ${c.textH} mb-1`}>
                {t("pharmacyAdminPatients.noPatients")}
              </h3>
              <p className={`text-sm ${c.textP} max-w-sm mx-auto`}>
                {searchTerm
                  ? t("pharmacyAdminPatients.noMatchSearch")
                  : t("pharmacyAdminPatients.noRegistered")}
              </p>
            </div>
          )}
        </div>
      </div>
    </BaseLayout>
  );
};

export default PharmacyAdminPatients;
