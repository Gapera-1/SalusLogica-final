import React, { useState, useEffect, useMemo, useCallback } from "react";
import BaseLayout from "../components/BaseLayout";
import { SkeletonDashboard } from "../components/SkeletonLoaders";
import useLanguage from "../i18n/useLanguage";
import { medicineAPI, analyticsAPI } from "../services/api";
import {
  Pill, Activity, TrendingUp, AlertTriangle, RefreshCw,
  PieChart as PieChartIcon, BarChart3, Package, List,
  Flame, Target, CheckCircle2, Clock, Sparkles, ArrowUpRight
} from "lucide-react";

// ─── Palette ────────────────────────────────────────────────────────────────
const CHART_COLORS = ['#0d9488','#14b8a6','#f59e0b','#ef4444','#8b5cf6','#3b82f6','#ec4899','#10b981','#f97316','#6366f1'];

// ─── SVG Donut Chart  ───────────────────────────────────────────────────────
const DonutChart = ({ data, size = 210, thickness = 36, centerLabel = "", centerValue = "" }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;
  const cx = size / 2, cy = size / 2, r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  let offset = circ * 0.25; // start at 12 o'clock

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border-color, #e5e7eb)" strokeWidth={thickness} opacity="0.35" />
        {data.map((d, i) => {
          const frac = d.value / total;
          const dash = frac * circ;
          const gap = circ - dash;
          const el = (
            <circle
              key={i} cx={cx} cy={cy} r={r} fill="none"
              stroke={d.color} strokeWidth={thickness}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-offset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.8s ease, stroke-dashoffset 0.8s ease' }}
            >
              <title>{d.label}: {d.value} ({(frac * 100).toFixed(1)}%)</title>
            </circle>
          );
          offset += dash;
          return el;
        })}
        {/* Center text */}
        {centerValue && (
          <>
            <text x={cx} y={cy - 6} textAnchor="middle" fontSize="28" fontWeight="800" fill="var(--text-primary, #0f172a)">{centerValue}</text>
            <text x={cx} y={cy + 16} textAnchor="middle" fontSize="11" fontWeight="500" fill="var(--text-secondary, #64748b)">{centerLabel}</text>
          </>
        )}
      </svg>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-4">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="inline-block w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
            <span>{d.label}</span>
            <span className="font-bold text-gray-900">({d.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── SVG Bar Chart (Histogram)  ─────────────────────────────────────────────
const BarChart = ({ data, height = 240, barColor = "#0d9488", label = "%", gridSteps = [0,25,50,75,100] }) => {
  if (!data.length) return null;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const maxGrid = Math.max(...gridSteps);
  const barW = Math.min(52, Math.max(22, Math.floor(560 / data.length) - 10));
  const chartW = data.length * (barW + 10) + 56;

  return (
    <div className="overflow-x-auto py-2">
      <svg width={Math.max(chartW, 320)} height={height + 58} className="mx-auto">
        {gridSteps.map(v => {
          const y = height - (v / maxGrid) * height + 14;
          return (
            <g key={v}>
              <text x="34" y={y + 4} textAnchor="end" fill="var(--text-tertiary, #94a3b8)" fontSize="10" fontWeight="500">{v}{label}</text>
              <line x1="40" y1={y} x2={chartW - 8} y2={y} stroke="var(--border-color, #e5e7eb)" strokeWidth="1" />
            </g>
          );
        })}
        {data.map((d, i) => {
          const barH = Math.max(3, (d.value / maxVal) * height);
          const x = 48 + i * (barW + 10);
          const y = height - barH + 14;
          const color = d.color || barColor;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={barH} rx="5" fill={color} opacity="0.88"
                style={{ transition: 'height 0.6s ease, y 0.6s ease' }}>
                <title>{d.label}: {d.value}{label}</title>
              </rect>
              <text x={x + barW / 2} y={y - 6} textAnchor="middle" fill="var(--text-primary, #111)" fontSize="10" fontWeight="700">
                {d.value}{label === "%" ? "%" : ""}
              </text>
              <text x={x + barW / 2} y={height + 34} textAnchor="middle" fill="var(--text-secondary, #64748b)" fontSize="9"
                transform={`rotate(-25, ${x + barW / 2}, ${height + 34})`}>
                {d.label.length > 10 ? d.label.slice(0, 10) + '…' : d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ─── SVG Progress Ring (Today's Doses) ──────────────────────────────────────
const ProgressRing = ({ value, max, size = 80, stroke = 8, color = "#0d9488" }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const dash = pct * circ;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border-color, #e5e7eb)" strokeWidth={stroke} opacity="0.4" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={circ * 0.25}
        strokeLinecap="round" style={{ transition: 'stroke-dasharray 0.8s ease' }} />
      <text x={size/2} y={size/2 + 1} textAnchor="middle" dominantBaseline="central"
        fontSize="16" fontWeight="800" fill="var(--text-primary)">{value}/{max}</text>
    </svg>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────
const AnalyticsDashboard = ({ setIsAuthenticated, setUser, user }) => {
  const { t } = useLanguage();
  const [medicines, setMedicines] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [trendRange, setTrendRange] = useState(14);

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      const [medsRes, dashRes] = await Promise.allSettled([
        medicineAPI.getAll(),
        analyticsAPI.getDashboard(),
      ]);
      if (medsRes.status === 'fulfilled') {
        setMedicines(Array.isArray(medsRes.value) ? medsRes.value : (medsRes.value?.results || []));
      }
      if (dashRes.status === 'fulfilled') {
        setDashboardData(dashRes.value);
      }
      setError(null);
    } catch (err) {
      console.error("Failed to load analytics:", err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Computed data ─────────────────────────────────────────────────────────
  const freqLabels = useMemo(() => ({
    once_daily: t('analytics.onceDaily') || 'Once Daily',
    twice_daily: t('analytics.twiceDaily') || 'Twice Daily',
    three_times_daily: t('analytics.threeTimesDaily') || '3× Daily',
    four_times_daily: t('analytics.fourTimesDaily') || '4× Daily',
    as_needed: t('analytics.asNeeded') || 'As Needed',
    weekly: t('analytics.weekly') || 'Weekly',
    monthly: t('analytics.monthly') || 'Monthly',
  }), [t]);

  const freqLabel = (f) => freqLabels[f] || f || '—';

  const stats = useMemo(() => {
    const active = medicines.filter(m => m.is_active && !m.completed).length;
    const completed = medicines.filter(m => m.completed).length;
    const lowStock = medicines.filter(m => m.is_active && !m.completed && (m.stock_count || 0) < 10).length;
    const adherence = dashboardData?.stats?.adherence_rate ?? null;
    const dosesToday = dashboardData?.stats?.doses_today ?? 0;
    const dosesTaken = dashboardData?.stats?.doses_taken_today ?? 0;
    const streak = dashboardData?.stats?.streak_days ?? 0;
    const missed = dashboardData?.stats?.missed_doses_week ?? 0;
    return { total: medicines.length, active, completed, lowStock, adherence, dosesToday, dosesTaken, streak, missed };
  }, [medicines, dashboardData]);

  const frequencyPieData = useMemo(() => {
    const counts = {};
    medicines.forEach(m => { const f = m.frequency || 'unknown'; counts[f] = (counts[f] || 0) + 1; });
    return Object.entries(counts).map(([k, v], i) => ({ label: freqLabel(k), value: v, color: CHART_COLORS[i % CHART_COLORS.length] }));
  }, [medicines, freqLabels]);

  const statusPieData = useMemo(() => {
    let a = 0, c = 0, n = 0;
    medicines.forEach(m => { if (m.completed) c++; else if (m.is_active) a++; else n++; });
    return [
      { label: t('analytics.active') || 'Active', value: a, color: '#10b981' },
      { label: t('analytics.completed') || 'Completed', value: c, color: '#6366f1' },
      { label: t('analytics.inactive') || 'Inactive', value: n, color: '#94a3b8' },
    ].filter(d => d.value > 0);
  }, [medicines, t]);

  const adherenceTrends = useMemo(() => {
    if (!dashboardData?.adherence_trends?.length) return [];
    return dashboardData.adherence_trends.slice(-trendRange).map(item => ({
      label: new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      value: Math.round(item.adherence_percentage || 0),
    }));
  }, [dashboardData, trendRange]);

  const stockBarData = useMemo(() => {
    return medicines
      .filter(m => m.is_active && !m.completed)
      .sort((a, b) => (a.stock_count || 0) - (b.stock_count || 0))
      .slice(0, 12)
      .map(m => ({
        label: m.name,
        value: m.stock_count || 0,
        color: (m.stock_count || 0) < 10 ? '#ef4444' : (m.stock_count || 0) < 30 ? '#f59e0b' : '#10b981',
      }));
  }, [medicines]);

  // Insight message
  const insight = useMemo(() => {
    if (stats.adherence == null) return null;
    const rate = Math.round(stats.adherence);
    if (rate >= 90) return { icon: Sparkles, color: '#10b981', msg: t('analytics.insightGreat') || `Excellent! ${rate}% adherence — keep it up!` };
    if (rate >= 70) return { icon: TrendingUp, color: '#f59e0b', msg: t('analytics.insightGood') || `Good progress at ${rate}%. A little more consistency will get you there!` };
    return { icon: Target, color: '#ef4444', msg: t('analytics.insightNeedsWork') || `${rate}% adherence — try setting reminders to improve.` };
  }, [stats.adherence, t]);

  if (loading) {
    return (
      <BaseLayout showNavigation={true} setIsAuthenticated={setIsAuthenticated}>
        <SkeletonDashboard />
      </BaseLayout>
    );
  }

  return (
    <BaseLayout showNavigation={true} setIsAuthenticated={setIsAuthenticated}>
      <div className="max-w-7xl mx-auto">

        {/* ─── Page Header ───────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
              <BarChart3 size={28} className="text-teal-600" />
              {t('analytics.title')}
            </h1>
            <p className="mt-1 text-gray-500 text-sm">{t('analytics.patientSubtitle') || 'Real-time insights from your medication data'}</p>
          </div>
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? (t('common.refreshing') || 'Refreshing…') : (t('common.refresh') || 'Refresh')}
          </button>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 p-3 rounded-xl">
            <AlertTriangle size={16} />
            {t('analytics.loadError') || 'Some data could not be loaded.'}
          </div>
        )}

        {/* ─── Today Banner + Streak ─────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
          {/* Today's Progress */}
          <div className="lg:col-span-2 rounded-2xl p-5"
            style={{ background: 'linear-gradient(135deg, var(--color-primary, #0d9488) 0%, #14b8a6 60%, #5eead4 100%)' }}>
            <div className="flex items-center gap-5">
              <ProgressRing value={stats.dosesTaken} max={stats.dosesToday} size={90} stroke={9} color="#fff" />
              <div className="text-white">
                <p className="text-sm font-medium opacity-80">{t('analytics.todayProgress') || "Today's Progress"}</p>
                <p className="text-2xl font-extrabold">
                  {stats.dosesTaken} / {stats.dosesToday} <span className="text-base font-medium opacity-70">{t('analytics.dosesTaken') || 'doses taken'}</span>
                </p>
                {stats.dosesToday > 0 && (
                  <div className="mt-2 w-52 h-2 bg-white/25 rounded-full overflow-hidden">
                    <div className="h-full bg-white rounded-full transition-all" style={{ width: `${Math.min(100, (stats.dosesTaken / stats.dosesToday) * 100)}%` }} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Streak Card */}
          <div className="rounded-2xl p-5 flex items-center gap-4"
            style={{ background: stats.streak > 0 ? 'linear-gradient(135deg, #f97316 0%, #f59e0b 100%)' : 'linear-gradient(135deg, #64748b 0%, #94a3b8 100%)' }}>
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <Flame size={28} className="text-white" />
            </div>
            <div className="text-white">
              <p className="text-3xl font-extrabold leading-none">{stats.streak}</p>
              <p className="text-sm font-medium opacity-80">{t('analytics.dayStreak') || 'Day Streak'}</p>
              {stats.streak >= 7 && <p className="text-xs opacity-60 mt-0.5">{t('analytics.streakFire') || '🔥 On fire!'}</p>}
            </div>
          </div>
        </div>

        {/* ─── Insight Banner ────────────────────────────────────────── */}
        {insight && (
          <div className="mb-6 flex items-center gap-3 p-4 rounded-xl border" style={{ borderColor: insight.color + '40', background: insight.color + '08' }}>
            <insight.icon size={22} style={{ color: insight.color }} className="flex-shrink-0" />
            <p className="text-sm font-medium" style={{ color: insight.color }}>{insight.msg}</p>
          </div>
        )}

        {/* ─── KPI Stat Cards ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: t('analytics.totalMedicines') || 'Total Medicines', value: stats.total, sub: t('analytics.allTime') || 'All time', icon: Pill, gradient: 'linear-gradient(135deg,#0d9488,#0f766e)' },
            { label: t('analytics.activeMedications') || 'Active', value: stats.active, sub: t('analytics.currentlyTracking') || 'Currently tracking', icon: Activity, gradient: 'linear-gradient(135deg,#10b981,#059669)' },
            { label: t('analytics.overallAdherence') || 'Adherence', value: stats.adherence != null ? `${Math.round(stats.adherence)}%` : '—', sub: t('analytics.last30Days') || 'Last 30 days', icon: TrendingUp, gradient: 'linear-gradient(135deg,#14b8a6,#0d9488)' },
            { label: t('analytics.lowStock') || 'Low Stock', value: stats.lowStock, sub: t('analytics.medicinesBelow10') || 'Below 10 units', icon: AlertTriangle, gradient: stats.lowStock > 0 ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#0d9488,#0f766e)' },
          ].map((card, i) => (
            <div key={i} className="group rounded-2xl p-5 text-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-default"
              style={{ background: card.gradient }}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-white/75 text-xs font-medium">{card.label}</p>
                  <p className="text-3xl font-extrabold mt-1 leading-none">{card.value}</p>
                  <p className="text-white/50 text-[10px] mt-1.5">{card.sub}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center group-hover:bg-white/25 transition-colors">
                  <card.icon size={20} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ─── Charts Row: Donut Charts ──────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
              <PieChartIcon size={20} className="text-teal-600" />
              {t('analytics.frequencyDistribution') || 'Frequency Distribution'}
            </h2>
            {frequencyPieData.length > 0 ? (
              <DonutChart data={frequencyPieData} size={210} thickness={34}
                centerValue={String(stats.total)} centerLabel={t('analytics.totalLabel') || 'Total'} />
            ) : (
              <div className="flex flex-col items-center justify-center h-52 text-gray-400">
                <PieChartIcon size={48} className="mb-2 opacity-30" />
                <p className="text-sm">{t('analytics.noMedicines') || 'No medicines added yet'}</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
              <PieChartIcon size={20} className="text-indigo-600" />
              {t('analytics.statusDistribution') || 'Medicine Status'}
            </h2>
            {statusPieData.length > 0 ? (
              <DonutChart data={statusPieData} size={210} thickness={34}
                centerValue={`${stats.active}`} centerLabel={t('analytics.activeLabel') || 'Active'} />
            ) : (
              <div className="flex flex-col items-center justify-center h-52 text-gray-400">
                <PieChartIcon size={48} className="mb-2 opacity-30" />
                <p className="text-sm">{t('analytics.noMedicines') || 'No medicines added yet'}</p>
              </div>
            )}
          </div>
        </div>

        {/* ─── Adherence Trend Histogram ──────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 size={20} className="text-teal-600" />
              {t('analytics.adherenceTrend') || 'Adherence Trend'}
            </h2>
            <div className="flex rounded-lg overflow-hidden border border-gray-200">
              {[{ v: 7, l: '7D' }, { v: 14, l: '14D' }, { v: 30, l: '30D' }].map(({ v, l }) => (
                <button key={v} onClick={() => setTrendRange(v)}
                  className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                    trendRange === v ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}>{l}</button>
              ))}
            </div>
          </div>
          {adherenceTrends.length > 0 ? (
            <BarChart data={adherenceTrends} height={220} barColor="#0d9488" label="%" />
          ) : (
            <div className="flex flex-col items-center justify-center h-52 text-gray-400">
              <BarChart3 size={48} className="mb-2 opacity-30" />
              <p className="text-sm">{t('analytics.noAdherenceData') || 'No adherence data available yet'}</p>
              <p className="text-xs mt-1 text-gray-300">{t('analytics.startTakingDoses') || 'Start taking your doses to see trends'}</p>
            </div>
          )}
        </div>

        {/* ─── Stock Levels Bar Chart ────────────────────────────────── */}
        {stockBarData.length > 0 && (
          <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Package size={20} className="text-amber-500" />
              {t('analytics.stockLevels') || 'Stock Levels'}
            </h2>
            <BarChart data={stockBarData} height={200} label=""
              gridSteps={(() => {
                const mx = Math.max(...stockBarData.map(d => d.value), 1);
                const step = Math.ceil(mx / 4);
                return [0, step, step * 2, step * 3, step * 4];
              })()} />
          </div>
        )}

        {/* ─── Medicine Table ────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <List size={20} className="text-teal-600" />
              {t('analytics.medicinePerformance') || 'Your Medicines'}
            </h2>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-50 text-teal-700">{medicines.length}</span>
          </div>
          {medicines.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('analytics.medicine') || 'Medicine'}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('analytics.dosage') || 'Dosage'}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('analytics.frequency') || 'Frequency'}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('analytics.stock') || 'Stock'}</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('analytics.status') || 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {medicines.map((med, i) => (
                    <tr key={med.id || i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                            style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}>
                            {(med.name || '?').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{med.name}</div>
                            {med.scientific_name && <div className="text-xs text-gray-400 italic">{med.scientific_name}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{med.dosage || '—'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{freqLabel(med.frequency)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {med.stock_count != null ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{
                                width: `${Math.min(100, ((med.stock_count || 0) / 100) * 100)}%`,
                                background: (med.stock_count || 0) < 10 ? '#ef4444' : (med.stock_count || 0) < 30 ? '#f59e0b' : '#10b981',
                              }} />
                            </div>
                            <span className="text-xs font-bold" style={{
                              color: (med.stock_count || 0) < 10 ? '#ef4444' : (med.stock_count || 0) < 30 ? '#f59e0b' : '#10b981',
                            }}>{med.stock_count}</span>
                          </div>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                          med.completed ? 'bg-indigo-100 text-indigo-700' :
                          med.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {med.completed ? (t('analytics.completed') || 'Completed') :
                           med.is_active ? (t('analytics.active') || 'Active') : (t('analytics.inactive') || 'Inactive')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Pill size={48} className="mb-3 opacity-30" />
              <p className="font-medium">{t('analytics.noMedicines') || 'No medicines added yet'}</p>
              <p className="text-xs mt-1 text-gray-300">{t('analytics.addMedicineTip') || 'Add your first medicine to see analytics'}</p>
            </div>
          )}
        </div>
      </div>
    </BaseLayout>
  );
};

export default AnalyticsDashboard;
