import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Users, UserCheck, AlertTriangle, ArrowRight,
  Building2, Shield, Activity, Settings, Clock,
  TrendingUp, Heart, Copy, Check,
} from "lucide-react";
import BaseLayout from "../components/BaseLayout";
import { useLanguage } from "../i18n";
import { useTheme } from "../contexts/ThemeContext";
import { API_BASE_URL } from "../services/api";

/* ───────────── inline keyframes (injected once) ───────────── */
const STYLE_ID = "pa-dash-anim";
if (typeof document !== "undefined" && !document.getElementById(STYLE_ID)) {
  const s = document.createElement("style");
  s.id = STYLE_ID;
  s.textContent = `
    @keyframes pa-fade-up   { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
    @keyframes pa-count-pop { 0%{transform:scale(.7);opacity:0} 60%{transform:scale(1.08)} 100%{transform:scale(1);opacity:1} }
    @keyframes pa-shimmer   { to{background-position:200% center} }
    .pa-fade-up   { animation: pa-fade-up .5s ease both }
    .pa-count-pop { animation: pa-count-pop .55s cubic-bezier(.34,1.56,.64,1) both }
    .pa-shimmer   { background-size:200% auto; animation: pa-shimmer 2.5s linear infinite }
  `;
  document.head.appendChild(s);
}

const PharmacyAdminDashboard = ({ setIsAuthenticated }) => {
  const { t } = useLanguage();
  const { isDark } = useTheme();

  const [pharmacyAdmin, setPharmacyAdmin] = useState(null);
  const [stats, setStats] = useState({
    totalPatients: 0,
    activePatients: 0,
    adverseReactions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(false);

  /* ───────── theme tokens ───────── */
  const c = isDark
    ? {
        pageBg: "bg-gray-950", surfaceBg: "bg-gray-900", surfaceBorder: "border-gray-800",
        textH: "text-gray-100", textP: "text-gray-400", textMuted: "text-gray-500",
        inputBg: "bg-gray-800", cardHover: "hover:bg-gray-800/60",
        errorBg: "bg-red-900/30", errorBorder: "border-red-800", errorText: "text-red-300",
      }
    : {
        pageBg: "bg-gray-50", surfaceBg: "bg-white", surfaceBorder: "border-gray-200",
        textH: "text-gray-900", textP: "text-gray-600", textMuted: "text-gray-400",
        inputBg: "bg-gray-100", cardHover: "hover:bg-gray-50",
        errorBg: "bg-red-50", errorBorder: "border-red-200", errorText: "text-red-700",
      };

  /* ───────── data fetch ───────── */
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("access_token");
        if (!token) { setError("Authentication token not found."); return; }

        const headers = { "Content-Type": "application/json", Authorization: `Token ${token}` };

        const [profileRes, reactionsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/pharmacy-admin/profile/`, { headers }),
          fetch(`${API_BASE_URL}/pharmacy-admin/adverse-reactions/`, { headers }),
        ]);

        if (!profileRes.ok) throw new Error("Failed to fetch pharmacy admin profile.");
        const profileData = await profileRes.json();
        setPharmacyAdmin(profileData);

        let reactionCount = 0;
        if (reactionsRes.ok) {
          const rd = await reactionsRes.json();
          reactionCount = Array.isArray(rd) ? rd.length : rd.count || 0;
        }

        setStats({
          totalPatients: profileData.patient_count || 0,
          activePatients: profileData.active_patient_count || 0,
          adverseReactions: reactionCount,
        });
      } catch (err) {
        console.error("Dashboard error:", err);
        setError(err.message || "Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const copyPharmacyId = () => {
    if (pharmacyAdmin?.pharmacy_id) {
      navigator.clipboard.writeText(pharmacyAdmin.pharmacy_id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  /* ───────── loading state ───────── */
  if (loading) {
    return (
      <BaseLayout showNavigation setIsAuthenticated={setIsAuthenticated}>
        <div className={`min-h-screen ${c.pageBg} flex items-center justify-center`}>
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-teal-200 dark:border-teal-900 opacity-30" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-teal-500 animate-spin" />
            </div>
            <p className={`${c.textP} font-medium`}>{t("pharmacyAdminDashboard.loading")}</p>
          </div>
        </div>
      </BaseLayout>
    );
  }

  /* ───────── error state ───────── */
  if (error) {
    return (
      <BaseLayout showNavigation setIsAuthenticated={setIsAuthenticated}>
        <div className={`min-h-screen ${c.pageBg} flex items-center justify-center px-4`}>
          <div className={`max-w-md w-full rounded-2xl border ${c.errorBorder} ${c.errorBg} p-6 text-center`}>
            <AlertTriangle className="mx-auto mb-3 text-red-500" size={36} />
            <p className={`${c.errorText} font-medium`}>{error}</p>
          </div>
        </div>
      </BaseLayout>
    );
  }

  /* ───────── stat card configs ───────── */
  const statCards = [
    {
      label: t("pharmacyAdminDashboard.totalPatients"),
      value: stats.totalPatients,
      icon: Users,
      gradient: "from-blue-500 to-indigo-600",
      bgLight: "bg-blue-50",  bgDark: "bg-blue-950/40",
      textLight: "text-blue-700", textDark: "text-blue-300",
    },
    {
      label: t("pharmacyAdminDashboard.activePatients"),
      value: stats.activePatients,
      icon: UserCheck,
      gradient: "from-emerald-500 to-teal-600",
      bgLight: "bg-emerald-50", bgDark: "bg-emerald-950/40",
      textLight: "text-emerald-700", textDark: "text-emerald-300",
    },
    {
      label: t("pharmacyAdminDashboard.adverseReactions"),
      value: stats.adverseReactions,
      icon: AlertTriangle,
      gradient: "from-rose-500 to-pink-600",
      bgLight: "bg-rose-50", bgDark: "bg-rose-950/40",
      textLight: "text-rose-700", textDark: "text-rose-300",
    },
  ];

  /* ───────── quick-action configs ───────── */
  const actions = [
    {
      to: "/pharmacy-admin/patients",
      icon: Users,
      title: t("pharmacyAdminDashboard.viewPatients"),
      desc: t("pharmacyAdminDashboard.viewPatientsDesc"),
      accentFrom: "from-blue-500", accentTo: "to-indigo-500",
    },
    {
      to: "/pharmacy-admin/adverse-reactions",
      icon: Activity,
      title: t("pharmacyAdminDashboard.adverseReactions"),
      desc: t("pharmacyAdminDashboard.adverseReactionsDesc"),
      accentFrom: "from-rose-500", accentTo: "to-pink-500",
    },
    {
      to: "/profile",
      icon: Settings,
      title: t("pharmacyAdminDashboard.profileSettings"),
      desc: t("pharmacyAdminDashboard.profileSettingsDesc"),
      accentFrom: "from-teal-500", accentTo: "to-emerald-500",
    },
  ];

  /* ═══════════════════════ RENDER ═══════════════════════ */
  return (
    <BaseLayout showNavigation setIsAuthenticated={setIsAuthenticated}>
      <div className={`min-h-screen ${c.pageBg} pb-12`}>

        {/* ─── HERO HEADER ─── */}
        <div className="relative overflow-hidden">
          {/* gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-teal-600 via-teal-500 to-emerald-500" />
          {/* decorative blobs */}
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-white/10 rounded-full blur-2xl" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pa-fade-up">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                    <Building2 className="text-white" size={24} />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white">
                      {t("pharmacyAdminDashboard.title")}
                    </h1>
                  </div>
                </div>
                {pharmacyAdmin && (
                  <p className="text-teal-100 mt-1 text-sm sm:text-base">
                    {t("pharmacyAdminDashboard.welcome")}{" "}
                    <span className="font-semibold text-white">{pharmacyAdmin.facility_name}</span>
                  </p>
                )}
              </div>

              {/* pharmacy ID badge */}
              {pharmacyAdmin && (
                <button
                  onClick={copyPharmacyId}
                  className="flex items-center gap-2 bg-white/15 hover:bg-white/25 backdrop-blur
                             text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-all
                             border border-white/20 active:scale-95 self-start sm:self-auto"
                >
                  <Shield size={16} />
                  <span>ID: {pharmacyAdmin.pharmacy_id}</span>
                  {copiedId ? <Check size={14} className="text-green-300" /> : <Copy size={14} className="opacity-60" />}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ─── MAIN CONTENT ─── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-10">

          {/* ─── STAT CARDS ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-8">
            {statCards.map((card, i) => {
              const Icon = card.icon;
              return (
                <div
                  key={i}
                  className={`pa-fade-up ${c.surfaceBg} rounded-2xl border ${c.surfaceBorder}
                              shadow-lg hover:shadow-xl transition-all duration-300 p-6 group`}
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center
                                    ${isDark ? card.bgDark : card.bgLight}`}>
                      <Icon size={22} className={isDark ? card.textDark : card.textLight} />
                    </div>
                    <TrendingUp size={16} className={`${c.textMuted} group-hover:text-teal-500 transition-colors`} />
                  </div>
                  <p className={`text-sm font-medium ${c.textP} mb-1`}>{card.label}</p>
                  <p className={`text-3xl sm:text-4xl font-extrabold pa-count-pop
                                 bg-gradient-to-r ${card.gradient} bg-clip-text text-transparent`}
                     style={{ animationDelay: `${0.3 + i * 0.12}s` }}
                  >
                    {card.value}
                  </p>
                </div>
              );
            })}
          </div>

          {/* ─── QUICK ACTIONS ─── */}
          <div className={`${c.surfaceBg} rounded-2xl border ${c.surfaceBorder} shadow-lg p-6 sm:p-8 pa-fade-up`}
               style={{ animationDelay: ".35s" }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-500
                              flex items-center justify-center">
                <Activity className="text-white" size={20} />
              </div>
              <h2 className={`text-xl font-bold ${c.textH}`}>
                {t("pharmacyAdminDashboard.quickActions")}
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {actions.map((a, i) => {
                const AIcon = a.icon;
                return (
                  <Link
                    key={i}
                    to={a.to}
                    className={`group relative flex items-start gap-4 p-5 rounded-xl border
                                ${c.surfaceBorder} ${c.cardHover} transition-all duration-200
                                hover:shadow-md active:scale-[.98]`}
                  >
                    {/* accent bar */}
                    <div className={`absolute left-0 top-4 bottom-4 w-1 rounded-full bg-gradient-to-b ${a.accentFrom} ${a.accentTo}
                                     opacity-0 group-hover:opacity-100 transition-opacity`} />

                    <div className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center
                                    bg-gradient-to-br ${a.accentFrom} ${a.accentTo} shadow-sm`}>
                      <AIcon className="text-white" size={20} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold ${c.textH} mb-1 flex items-center gap-1`}>
                        {a.title}
                        <ArrowRight size={14}
                          className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5
                                     transition-all text-teal-500" />
                      </p>
                      <p className={`text-sm ${c.textP} leading-relaxed line-clamp-2`}>{a.desc}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* ─── FOOTER META ROW ─── */}
          <div className="mt-6 flex items-center justify-center gap-2 pa-fade-up" style={{ animationDelay: ".5s" }}>
            <Clock size={14} className={c.textMuted} />
            <p className={`text-xs ${c.textMuted}`}>
              {t("pharmacyAdminDashboard.lastUpdated") || "Last updated"}: {new Date().toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </BaseLayout>
  );
};

export default PharmacyAdminDashboard;
