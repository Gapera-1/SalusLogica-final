import React, { useState, useEffect, useMemo } from "react";
import BaseLayout from "../components/BaseLayout";
import { SkeletonDashboard } from "../components/SkeletonLoaders";
import useLanguage from "../i18n/useLanguage";
import { medicineAPI, analyticsAPI } from "../services/api";

// ─── SVG Pie Chart Component ────────────────────────────────────────────────
const PieChart = ({ data, size = 220 }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return null;
  const cx = size / 2, cy = size / 2, r = size / 2 - 10;
  let cumulative = 0;

  const slices = data.map((d, i) => {
    const fraction = d.value / total;
    const startAngle = cumulative * 2 * Math.PI - Math.PI / 2;
    cumulative += fraction;
    const endAngle = cumulative * 2 * Math.PI - Math.PI / 2;
    const largeArc = fraction > 0.5 ? 1 : 0;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    // If there's only one slice (100%), draw a full circle
    if (fraction >= 0.9999) {
      return (
        <circle key={i} cx={cx} cy={cy} r={r} fill={d.color} stroke="white" strokeWidth="2" />
      );
    }
    return (
      <path
        key={i}
        d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
        fill={d.color}
        stroke="white"
        strokeWidth="2"
      >
        <title>{d.label}: {d.value} ({(fraction * 100).toFixed(1)}%)</title>
      </path>
    );
  });

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices}
      </svg>
      <div className="flex flex-wrap justify-center gap-3 mt-4">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
            <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
            {d.label} ({d.value})
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── SVG Bar Chart (Histogram) Component ────────────────────────────────────
const BarChart = ({ data, height = 260, barColor = "#0d9488", label = "%" }) => {
  if (!data.length) return null;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const barWidth = Math.min(48, Math.max(24, Math.floor(500 / data.length) - 8));
  const chartWidth = data.length * (barWidth + 12) + 40;

  return (
    <div className="overflow-x-auto">
      <svg width={Math.max(chartWidth, 300)} height={height + 50} className="mx-auto">
        {/* Y-axis labels */}
        {[0, 25, 50, 75, 100].map(pct => {
          const y = height - (pct / 100) * height + 10;
          return (
            <g key={pct}>
              <text x="30" y={y + 4} textAnchor="end" className="fill-gray-400" fontSize="11">{pct}{label}</text>
              <line x1="35" y1={y} x2={chartWidth} y2={y} stroke="#e5e7eb" strokeDasharray="3,3" />
            </g>
          );
        })}
        {/* Bars */}
        {data.map((d, i) => {
          const barH = (d.value / maxVal) * height;
          const x = 40 + i * (barWidth + 12);
          const y = height - barH + 10;
          const color = d.color || barColor;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barWidth} height={barH} rx="4" fill={color} opacity="0.85">
                <title>{d.label}: {d.value}{label}</title>
              </rect>
              <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" className="fill-gray-700" fontSize="11" fontWeight="600">
                {d.value}{label === "%" ? "%" : ""}
              </text>
              <text x={x + barWidth / 2} y={height + 28} textAnchor="middle" className="fill-gray-500" fontSize="10" transform={`rotate(-20, ${x + barWidth / 2}, ${height + 28})`}>
                {d.label.length > 10 ? d.label.slice(0, 10) + '…' : d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

// ─── Palette ────────────────────────────────────────────────────────────────
const CHART_COLORS = ['#0d9488', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6', '#ec4899', '#10b981', '#f97316', '#6366f1'];

const AnalyticsDashboard = ({ setIsAuthenticated, setUser, user }) => {
  const { t } = useLanguage();
  const [userRole, setUserRole] = useState("PATIENT");
  const [medicines, setMedicines] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
        setUserRole(storedUser.role?.toUpperCase() || storedUser.user_type?.toUpperCase() || "PATIENT");

        // Fetch real data in parallel
        const [medsResponse, dashResponse] = await Promise.allSettled([
          medicineAPI.getAll(),
          analyticsAPI.getDashboard(),
        ]);

        if (medsResponse.status === 'fulfilled') {
          const medsData = Array.isArray(medsResponse.value) ? medsResponse.value : (medsResponse.value?.results || []);
          setMedicines(medsData);
        }
        if (dashResponse.status === 'fulfilled') {
          setDashboardData(dashResponse.value);
        }
      } catch (err) {
        console.error("Failed to load analytics:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // ── Computed chart data from real medicines ──────────────────────────────
  const frequencyPieData = useMemo(() => {
    const counts = {};
    medicines.forEach(m => {
      const freq = m.frequency || 'unknown';
      counts[freq] = (counts[freq] || 0) + 1;
    });
    const labels = {
      once_daily: t('analytics.onceDaily') || 'Once Daily',
      twice_daily: t('analytics.twiceDaily') || 'Twice Daily',
      three_times_daily: t('analytics.threeTimesDaily') || '3x Daily',
      four_times_daily: t('analytics.fourTimesDaily') || '4x Daily',
      as_needed: t('analytics.asNeeded') || 'As Needed',
      weekly: t('analytics.weekly') || 'Weekly',
      monthly: t('analytics.monthly') || 'Monthly',
    };
    return Object.entries(counts).map(([key, val], i) => ({
      label: labels[key] || key,
      value: val,
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
  }, [medicines, t]);

  const statusPieData = useMemo(() => {
    let active = 0, completed = 0, inactive = 0;
    medicines.forEach(m => {
      if (m.completed) completed++;
      else if (m.is_active) active++;
      else inactive++;
    });
    return [
      { label: t('analytics.active') || 'Active', value: active, color: '#10b981' },
      { label: t('analytics.completed') || 'Completed', value: completed, color: '#6366f1' },
      { label: t('analytics.inactive') || 'Inactive', value: inactive, color: '#94a3b8' },
    ].filter(d => d.value > 0);
  }, [medicines, t]);

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

  const adherenceTrends = useMemo(() => {
    if (!dashboardData?.adherence_trends?.length) return [];
    return dashboardData.adherence_trends.slice(-14).map(t => ({
      label: new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      value: Math.round(t.adherence_percentage || 0),
    }));
  }, [dashboardData]);

  const stats = useMemo(() => {
    const activeMeds = medicines.filter(m => m.is_active && !m.completed);
    const completedMeds = medicines.filter(m => m.completed);
    const lowStock = activeMeds.filter(m => (m.stock_count || 0) < 10);
    const avgAdherence = dashboardData?.stats?.adherence_rate ?? null;
    return { total: medicines.length, active: activeMeds.length, completed: completedMeds.length, lowStock: lowStock.length, avgAdherence };
  }, [medicines, dashboardData]);

  // ── Frequency label helper ──────────────────────────────────────────────
  const freqLabel = (f) => {
    const map = { once_daily: 'Once Daily', twice_daily: 'Twice Daily', three_times_daily: '3× Daily', four_times_daily: '4× Daily', as_needed: 'As Needed', weekly: 'Weekly', monthly: 'Monthly' };
    return map[f] || f;
  };

  if (loading) {
    return (
      <BaseLayout showNavigation={true} setIsAuthenticated={setIsAuthenticated}>
        <SkeletonDashboard />
      </BaseLayout>
    );
  }

  return (
    <BaseLayout showNavigation={true} setIsAuthenticated={setIsAuthenticated}>
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">{t('analytics.title')}</h1>
          <p className="mt-2 text-gray-600">
            {userRole === "PATIENT" ? t('analytics.patientSubtitle') : userRole === "PHARMACY_ADMIN" ? t('analytics.pharmacyAdminSubtitle') : t('analytics.adminSubtitle')}
          </p>
          {error && (
            <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
              {t('analytics.loadError') || 'Some data could not be loaded.'}
            </div>
          )}
        </div>

        {/* ─── KPI Stat Cards ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="stat-card" style={{ background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)", color: "white", borderRadius: "12px", padding: "20px", transition: "transform 0.3s ease" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">{t('analytics.totalMedicines') || 'Total Medicines'}</p>
                <p className="text-3xl font-bold">{stats.total}</p>
                <p className="text-white/60 text-xs mt-1">{t('analytics.allTime') || 'All time'}</p>
              </div>
              <div className="text-white/20"><i className="fas fa-capsules text-4xl"></i></div>
            </div>
          </div>

          <div className="stat-card" style={{ background: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)", color: "white", borderRadius: "12px", padding: "20px", transition: "transform 0.3s ease" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">{t('analytics.activeMedications') || 'Active Medications'}</p>
                <p className="text-3xl font-bold">{stats.active}</p>
                <p className="text-white/60 text-xs mt-1">{t('analytics.currentlyTracking') || 'Currently tracking'}</p>
              </div>
              <div className="text-white/20"><i className="fas fa-pills text-4xl"></i></div>
            </div>
          </div>

          <div className="stat-card" style={{ background: "linear-gradient(135deg, #5eead4 0%, #14b8a6 100%)", color: "white", borderRadius: "12px", padding: "20px", transition: "transform 0.3s ease" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">{t('analytics.overallAdherence') || 'Adherence Rate'}</p>
                <p className="text-3xl font-bold">{stats.avgAdherence != null ? `${Math.round(stats.avgAdherence)}%` : '—'}</p>
                <p className="text-white/60 text-xs mt-1">{t('analytics.last30Days') || 'Last 30 days'}</p>
              </div>
              <div className="text-white/20"><i className="fas fa-chart-line text-4xl"></i></div>
            </div>
          </div>

          <div className="stat-card" style={{ background: stats.lowStock > 0 ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)" : "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)", color: "white", borderRadius: "12px", padding: "20px", transition: "transform 0.3s ease" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/80 text-sm">{t('analytics.lowStock') || 'Low Stock'}</p>
                <p className="text-3xl font-bold">{stats.lowStock}</p>
                <p className="text-white/60 text-xs mt-1">{t('analytics.medicinesBelow10') || 'Medicines below 10'}</p>
              </div>
              <div className="text-white/20"><i className="fas fa-exclamation-triangle text-4xl"></i></div>
            </div>
          </div>
        </div>

        {/* ─── Charts Row: Pie Charts ──────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Frequency Distribution Pie Chart */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              <i className="fas fa-chart-pie text-teal-600 mr-2"></i>
              {t('analytics.frequencyDistribution') || 'Medicine Frequency Distribution'}
            </h2>
            {frequencyPieData.length > 0 ? (
              <PieChart data={frequencyPieData} size={220} />
            ) : (
              <div className="flex items-center justify-center h-48 text-gray-400">
                <div className="text-center">
                  <i className="fas fa-chart-pie text-5xl mb-2"></i>
                  <p>{t('analytics.noMedicines') || 'No medicines added yet'}</p>
                </div>
              </div>
            )}
          </div>

          {/* Status Pie Chart */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              <i className="fas fa-chart-pie text-indigo-600 mr-2"></i>
              {t('analytics.statusDistribution') || 'Medicine Status Overview'}
            </h2>
            {statusPieData.length > 0 ? (
              <PieChart data={statusPieData} size={220} />
            ) : (
              <div className="flex items-center justify-center h-48 text-gray-400">
                <div className="text-center">
                  <i className="fas fa-chart-pie text-5xl mb-2"></i>
                  <p>{t('analytics.noMedicines') || 'No medicines added yet'}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── Adherence Trend Histogram ───────────────────────────────── */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            <i className="fas fa-chart-bar text-teal-600 mr-2"></i>
            {t('analytics.adherenceTrend') || 'Adherence Trend (Last 14 Days)'}
          </h2>
          {adherenceTrends.length > 0 ? (
            <BarChart data={adherenceTrends} height={220} barColor="#0d9488" label="%" />
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-400">
              <div className="text-center">
                <i className="fas fa-chart-bar text-5xl mb-2"></i>
                <p>{t('analytics.noAdherenceData') || 'No adherence data available yet'}</p>
                <p className="text-sm mt-1">{t('analytics.startTakingDoses') || 'Start taking your doses to see trends'}</p>
              </div>
            </div>
          )}
        </div>

        {/* ─── Stock Levels Bar Chart ──────────────────────────────────── */}
        {stockBarData.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              <i className="fas fa-boxes text-amber-600 mr-2"></i>
              {t('analytics.stockLevels') || 'Stock Levels'}
            </h2>
            <BarChart data={stockBarData} height={200} label="" />
          </div>
        )}

        {/* ─── Medicine List Table ─────────────────────────────────────── */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            <i className="fas fa-list text-teal-600 mr-2"></i>
            {t('analytics.medicinePerformance') || 'Your Medicines'}
          </h2>
          {medicines.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('analytics.medicine') || 'Medicine'}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('analytics.dosage') || 'Dosage'}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('analytics.frequency') || 'Frequency'}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('analytics.stock') || 'Stock'}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('analytics.status') || 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {medicines.map((med, index) => (
                    <tr key={med.id || index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{med.name}</div>
                        {med.scientific_name && <div className="text-xs text-gray-500 italic">{med.scientific_name}</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{med.dosage || '—'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{freqLabel(med.frequency)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-semibold ${(med.stock_count || 0) < 10 ? 'text-red-600' : (med.stock_count || 0) < 30 ? 'text-amber-600' : 'text-green-600'}`}>
                          {med.stock_count ?? '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          med.completed ? 'bg-indigo-100 text-indigo-800' :
                          med.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
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
            <div className="text-center py-8 text-gray-400">
              <i className="fas fa-prescription-bottle text-5xl mb-3"></i>
              <p>{t('analytics.noMedicines') || 'No medicines added yet'}</p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .stat-card:hover {
          transform: translateY(-5px);
        }
      `}</style>
    </BaseLayout>
  );
};

export default AnalyticsDashboard;
