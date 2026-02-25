import React, { useState, useEffect } from "react";
import BaseLayout from "../components/BaseLayout";
import { SkeletonDashboard } from "../components/SkeletonLoaders";
import useLanguage from "../i18n/useLanguage";
import { API_BASE_URL } from "../services/api";

const ExportReports = ({ setIsAuthenticated }) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [recentExports, setRecentExports] = useState([]);
  const [notification, setNotification] = useState(null);

  const reportTypes = [
    {
      type: "medicine_list",
      name: t("exportReports.medicineList"),
      description: t("exportReports.medicineListDesc"),
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      ),
      color: "teal",
      gradient: "from-teal-500 to-teal-600",
      bgLight: "bg-teal-50",
      textColor: "text-teal-700",
      borderColor: "border-teal-200",
    },
    {
      type: "dose_history",
      name: t("exportReports.doseHistory"),
      description: t("exportReports.doseHistoryDesc"),
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: "blue",
      gradient: "from-blue-500 to-blue-600",
      bgLight: "bg-blue-50",
      textColor: "text-blue-700",
      borderColor: "border-blue-200",
    },
    {
      type: "adherence_report",
      name: t("exportReports.adherenceReport"),
      description: t("exportReports.adherenceReportDesc"),
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      ),
      color: "purple",
      gradient: "from-purple-500 to-purple-600",
      bgLight: "bg-purple-50",
      textColor: "text-purple-700",
      borderColor: "border-purple-200",
    },
    {
      type: "full_report",
      name: t("exportReports.fullReport"),
      description: t("exportReports.fullReportDesc"),
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
        </svg>
      ),
      color: "amber",
      gradient: "from-amber-500 to-amber-600",
      bgLight: "bg-amber-50",
      textColor: "text-amber-700",
      borderColor: "border-amber-200",
    },
  ];

  const periodOptions = [
    { value: 7, label: t("exportReports.last7Days") },
    { value: 14, label: t("exportReports.last14Days") },
    { value: 30, label: t("exportReports.last30Days") },
    { value: 60, label: t("exportReports.last60Days") },
    { value: 90, label: t("exportReports.last90Days") },
    { value: 180, label: t("exportReports.last6Months") },
    { value: 365, label: t("exportReports.lastYear") },
  ];

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const showNotification = (message, type = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleDownloadPDF = async (reportType) => {
    setGenerating(reportType);
    try {
      const token = localStorage.getItem("access_token");
      const response = await fetch(
        `${API_BASE_URL}/analytics/reports/download/?type=${reportType}&days=${selectedPeriod}`,
        {
          headers: {
            Authorization: `Token ${token}`,
          },
          credentials: "include",
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to generate report");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // Extract filename from Content-Disposition or use default
      const disposition = response.headers.get("Content-Disposition");
      let filename = `saluslogica_${reportType}_${new Date().toISOString().slice(0, 10)}.pdf`;
      if (disposition) {
        const match = disposition.match(/filename="?(.+?)"?$/);
        if (match) filename = match[1];
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Track in recent exports
      setRecentExports((prev) => [
        {
          type: reportType,
          name: reportTypes.find((r) => r.type === reportType)?.name || reportType,
          date: new Date().toISOString(),
          period: selectedPeriod,
          status: "completed",
        },
        ...prev.slice(0, 9),
      ]);

      showNotification(t("exportReports.downloadSuccess"), "success");
    } catch (err) {
      console.error("PDF download error:", err);
      showNotification(
        err.message || t("exportReports.downloadError"),
        "error"
      );
    } finally {
      setGenerating(null);
    }
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
      <div className="px-4 py-6 sm:px-0">
        {/* Notification toast */}
        {notification && (
          <div
            className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-medium transition-all duration-300 ${
              notification.type === "success"
                ? "bg-green-500"
                : "bg-red-500"
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === "success" ? (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              {notification.message}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-teal-100 rounded-xl">
              <svg className="w-7 h-7 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {t("exportReports.title")}
              </h1>
              <p className="text-gray-500 text-sm">
                {t("exportReports.subtitle")}
              </p>
            </div>
          </div>
        </div>

        {/* Period Selector */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {t("exportReports.selectPeriod")}
          </h3>
          <div className="flex flex-wrap gap-2">
            {periodOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelectedPeriod(opt.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  selectedPeriod === opt.value
                    ? "bg-teal-600 text-white shadow-md shadow-teal-200"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Report Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          {reportTypes.map((report) => (
            <div
              key={report.type}
              className={`bg-white rounded-xl shadow-sm border ${report.borderColor} hover:shadow-md transition-all duration-300 overflow-hidden`}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl ${report.bgLight} ${report.textColor}`}>
                    {report.icon}
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${report.bgLight} ${report.textColor}`}>
                    PDF
                  </span>
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  {report.name}
                </h3>
                <p className="text-sm text-gray-500 mb-5 leading-relaxed">
                  {report.description}
                </p>

                <button
                  onClick={() => handleDownloadPDF(report.type)}
                  disabled={generating !== null}
                  className={`w-full py-2.5 px-4 rounded-lg text-white font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                    generating === report.type
                      ? "bg-gray-400 cursor-wait"
                      : generating !== null
                      ? "bg-gray-300 cursor-not-allowed"
                      : `bg-gradient-to-r ${report.gradient} hover:shadow-lg hover:-translate-y-0.5`
                  }`}
                >
                  {generating === report.type ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      {t("exportReports.generating")}
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      {t("exportReports.downloadPDF")}
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Exports */}
        {recentExports.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t("exportReports.recentExports")}
            </h3>
            <div className="space-y-3">
              {recentExports.map((exp, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-green-100 rounded-lg">
                      <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{exp.name}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(exp.date).toLocaleString()} &middot;{" "}
                        {periodOptions.find((p) => p.value === exp.period)?.label || `${exp.period} days`}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                    {t("exportReports.completed")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Banner */}
        <div className="mt-6 bg-teal-50 border border-teal-200 rounded-xl p-5">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="text-sm font-semibold text-teal-800 mb-1">
                {t("exportReports.infoTitle")}
              </h4>
              <p className="text-xs text-teal-700 leading-relaxed">
                {t("exportReports.infoDescription")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </BaseLayout>
  );
};

export default ExportReports;
