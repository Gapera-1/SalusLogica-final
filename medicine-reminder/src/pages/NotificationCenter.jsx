import React, { useState, useEffect, useCallback } from "react";
import Navigation from "../components/Navigation";
import { notificationAPI } from "../services/api";
import { useLanguage } from "../i18n";
import usePushNotifications from "../hooks/usePushNotifications";

const NotificationCenter = ({ setIsAuthenticated }) => {
  const { t } = useLanguage();
  const {
    pushSupported,
    pushEnabled,
    enabling,
    enablePush,
    disablePush,
    sendTestPush,
    foregroundPayload,
  } = usePushNotifications();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [toast, setToast] = useState(null);
  const [devices, setDevices] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Fetch notifications from backend ──
  const fetchNotifications = useCallback(async () => {
    try {
      const data = await notificationAPI.getCenter();
      const list = Array.isArray(data)
        ? data
        : data.results || data.unread_notifications || [];
      setNotifications(list);
      setUnreadCount(
        data.unread_count ?? list.filter((n) => !n.is_read).length
      );
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  }, []);

  const fetchDevices = useCallback(async () => {
    try {
      const data = await notificationAPI.listDevices();
      setDevices(Array.isArray(data) ? data : []);
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchNotifications(), fetchDevices()]);
      setLoading(false);
    };
    load();
  }, [fetchNotifications, fetchDevices]);

  // Re-fetch when a foreground push arrives
  const prevPayloadRef = React.useRef(foregroundPayload);
  useEffect(() => {
    if (foregroundPayload && foregroundPayload !== prevPayloadRef.current) {
      prevPayloadRef.current = foregroundPayload;
      // Defer the re-fetch to avoid synchronous setState inside effect
      const id = setTimeout(() => fetchNotifications(), 0);
      return () => clearTimeout(id);
    }
  }, [foregroundPayload, fetchNotifications]);

  // ── Actions ──
  const handleMarkRead = async (id) => {
    try {
      await notificationAPI.markRead(id);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, is_read: true, status: "read" } : n
        )
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      showToast(t("notifications.markReadError"), "error");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, status: "read" }))
      );
      setUnreadCount(0);
      showToast(t("notifications.allMarkedRead"));
    } catch {
      showToast(t("notifications.markReadError"), "error");
    }
  };

  const handleDelete = async (id) => {
    try {
      await notificationAPI.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      showToast(t("notifications.deleted"));
    } catch {
      showToast(t("notifications.deleteError"), "error");
    }
  };

  const handleEnablePush = async () => {
    const ok = await enablePush();
    if (ok) {
      showToast(t("notifications.pushEnabled"));
      fetchDevices();
    } else {
      showToast(t("notifications.pushDenied"), "error");
    }
  };

  const handleDisablePush = async () => {
    await disablePush();
    showToast(t("notifications.pushDisabled"));
    fetchDevices();
  };

  const handleTestPush = async () => {
    const result = await sendTestPush();
    if (result) {
      showToast(
        t("notifications.testPushSent").replace(
          "{count}",
          result.devices_reached || 0
        )
      );
    } else {
      showToast(t("notifications.testPushError"), "error");
    }
  };

  // ── Helpers ──
  const getTypeIcon = (type) => {
    const icons = {
      dose_reminder: "\uD83D\uDC8A",
      missed_dose: "\u23F0",
      medicine_refill: "\uD83D\uDCE6",
      interaction_alert: "\u26A0\uFE0F",
      system: "\uD83D\uDD14",
    };
    return icons[type] || "\uD83D\uDD14";
  };

  const getStatusStyle = (s) => {
    const styles = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
      sent: "bg-blue-100 text-blue-800 border-blue-300",
      delivered: "bg-teal-100 text-teal-800 border-teal-300",
      read: "bg-gray-100 text-gray-600 border-gray-300",
      failed: "bg-red-100 text-red-800 border-red-300",
    };
    return styles[s] || "bg-gray-100 text-gray-600";
  };

  const formatDate = (d) => {
    if (!d) return "\u2014";
    return new Date(d).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.is_read;
    if (filter === "read") return n.is_read;
    if (filter === "failed") return n.status === "failed";
    return true;
  });

  const stats = {
    total: notifications.length,
    unread: unreadCount,
    sent: notifications.filter(
      (n) => n.status === "sent" || n.status === "delivered"
    ).length,
    failed: notifications.filter((n) => n.status === "failed").length,
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--page-bg)" }}>
      <Navigation setIsAuthenticated={setIsAuthenticated} />

      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 animate-fade-in">
          <div
            className={`px-5 py-3 rounded-xl shadow-lg text-sm font-medium ${
              toast.type === "error"
                ? "bg-red-500 text-white"
                : "bg-teal-500 text-white"
            }`}
          >
            {toast.message}
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1
              className="text-3xl font-bold"
              style={{ color: "var(--text-primary)" }}
            >
              {t("notifications.title")}
            </h1>
            <p
              className="mt-1 text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("notifications.subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="px-4 py-2 text-sm font-medium rounded-xl border transition-colors hover:bg-gray-50"
                style={{
                  borderColor: "var(--border-color)",
                  color: "var(--text-primary)",
                }}
              >
                {t("notifications.markAllRead")}
              </button>
            )}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              {t("notifications.pushSettings")}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: t("notifications.total"),
              value: stats.total,
              icon: "\uD83D\uDCCB",
              bg: "bg-teal-100 text-teal-600",
            },
            {
              label: t("notifications.unread"),
              value: stats.unread,
              icon: "\uD83D\uDD35",
              bg: "bg-blue-100 text-blue-600",
            },
            {
              label: t("notifications.sent"),
              value: stats.sent,
              icon: "\u2705",
              bg: "bg-green-100 text-green-600",
            },
            {
              label: t("notifications.failed"),
              value: stats.failed,
              icon: "\u274C",
              bg: "bg-red-100 text-red-600",
            },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl p-5 border"
              style={{
                background: "var(--card-bg)",
                borderColor: "var(--border-color)",
              }}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg text-xl ${s.bg}`}>
                  {s.icon}
                </div>
                <div>
                  <p
                    className="text-2xl font-bold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {s.value}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {s.label}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Push Notification Settings Panel */}
        {showSettings && (
          <div
            className="rounded-2xl border p-6 mb-8 animate-fade-in"
            style={{
              background: "var(--card-bg)",
              borderColor: "var(--border-color)",
            }}
          >
            <h2
              className="text-lg font-semibold mb-4"
              style={{ color: "var(--text-primary)" }}
            >
              {t("notifications.pushSettingsTitle")}
            </h2>

            {/* Push Toggle */}
            <div
              className="flex items-center justify-between p-4 rounded-xl border mb-4"
              style={{ borderColor: "var(--border-color)" }}
            >
              <div>
                <p
                  className="font-medium text-sm"
                  style={{ color: "var(--text-primary)" }}
                >
                  {t("notifications.pushNotifications")}
                </p>
                <p
                  className="text-xs mt-0.5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {pushEnabled
                    ? t("notifications.pushEnabledDesc")
                    : pushSupported
                    ? t("notifications.pushDisabledDesc")
                    : t("notifications.pushNotSupported")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {pushEnabled && (
                  <button
                    onClick={handleTestPush}
                    className="px-3 py-1.5 text-xs font-medium border rounded-lg hover:bg-gray-50 transition-colors"
                    style={{
                      borderColor: "var(--border-color)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {t("notifications.testPush")}
                  </button>
                )}
                {pushSupported && (
                  <button
                    onClick={
                      pushEnabled ? handleDisablePush : handleEnablePush
                    }
                    disabled={enabling}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      pushEnabled
                        ? "bg-red-100 text-red-700 hover:bg-red-200"
                        : "bg-teal-600 text-white hover:bg-teal-700"
                    } ${enabling ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {enabling
                      ? t("notifications.enabling")
                      : pushEnabled
                      ? t("notifications.disablePush")
                      : t("notifications.enablePush")}
                  </button>
                )}
              </div>
            </div>

            {/* Registered Devices */}
            {devices.length > 0 && (
              <div>
                <p
                  className="text-sm font-medium mb-2"
                  style={{ color: "var(--text-primary)" }}
                >
                  {t("notifications.registeredDevices")} ({devices.length})
                </p>
                <div className="space-y-2">
                  {devices.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between px-4 py-2 rounded-lg border text-sm"
                      style={{ borderColor: "var(--border-color)" }}
                    >
                      <div className="flex items-center gap-2">
                        <span>
                          {d.device_type === "web"
                            ? "\uD83C\uDF10"
                            : d.device_type === "android"
                            ? "\uD83D\uDCF1"
                            : "\uD83C\uDF4E"}
                        </span>
                        <span style={{ color: "var(--text-primary)" }}>
                          {d.device_name || d.device_type}
                        </span>
                      </div>
                      <span
                        className="text-xs"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {formatDate(d.updated_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {["all", "unread", "read", "failed"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                filter === f
                  ? "bg-teal-600 text-white"
                  : "border hover:bg-gray-50"
              }`}
              style={
                filter !== f
                  ? {
                      borderColor: "var(--border-color)",
                      color: "var(--text-primary)",
                    }
                  : undefined
              }
            >
              {t(`notifications.filter.${f}`)}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="rounded-2xl border p-12 text-center"
            style={{
              background: "var(--card-bg)",
              borderColor: "var(--border-color)",
            }}
          >
            <div className="text-5xl mb-4">{"\uD83D\uDD15"}</div>
            <h3
              className="text-lg font-semibold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              {t("notifications.noNotifications")}
            </h3>
            <p
              className="text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("notifications.noNotificationsDesc")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((n) => (
              <div
                key={n.id}
                className={`rounded-2xl border p-5 transition-shadow hover:shadow-md ${
                  !n.is_read ? "border-l-4 border-l-teal-500" : ""
                }`}
                style={{
                  background: "var(--card-bg)",
                  borderColor: n.is_read
                    ? "var(--border-color)"
                    : undefined,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="text-2xl flex-shrink-0">
                      {getTypeIcon(n.notification_type)}
                    </span>
                    <div className="min-w-0">
                      <h3
                        className={`font-semibold ${
                          n.is_read ? "font-normal" : ""
                        }`}
                        style={{ color: "var(--text-primary)" }}
                      >
                        {n.title}
                      </h3>
                      <p
                        className="text-sm mt-0.5"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {n.message}
                      </p>
                      <div
                        className="flex items-center gap-3 mt-2 text-xs"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        <span>{formatDate(n.created_at)}</span>
                        {n.status && (
                          <span
                            className={`px-2 py-0.5 rounded-full border text-xs font-medium ${getStatusStyle(
                              n.status
                            )}`}
                          >
                            {t(
                              `notifications.status.${n.status}`
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!n.is_read && (
                      <button
                        onClick={() => handleMarkRead(n.id)}
                        className="p-2 rounded-lg hover:bg-teal-50 transition-colors"
                        title={t("notifications.markRead")}
                      >
                        <svg
                          className="w-4 h-4 text-teal-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(n.id)}
                      className="p-2 rounded-lg hover:bg-red-50 transition-colors"
                      title={t("notifications.delete")}
                    >
                      <svg
                        className="w-4 h-4 text-red-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info banner */}
        <div
          className="mt-8 rounded-2xl border p-6"
          style={{
            background: "var(--card-bg)",
            borderColor: "var(--border-color)",
          }}
        >
          <h3
            className="text-sm font-semibold mb-2"
            style={{ color: "var(--text-primary)" }}
          >
            {t("notifications.infoTitle")}
          </h3>
          <p
            className="text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            {t("notifications.infoDescription")}
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;
