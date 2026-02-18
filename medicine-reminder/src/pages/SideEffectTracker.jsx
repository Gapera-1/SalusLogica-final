import React, { useState, useEffect, useCallback } from "react";
import Navigation from "../components/Navigation";
import { sideEffectAPI, medicineAPI } from "../services/api";
import { useLanguage } from "../i18n";

const SEVERITY_OPTIONS = [
  { value: "mild", color: "bg-green-100 text-green-800 border-green-300" },
  { value: "moderate", color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  { value: "severe", color: "bg-orange-100 text-orange-800 border-orange-300" },
  { value: "life_threatening", color: "bg-red-100 text-red-800 border-red-300" },
];

const REACTION_TYPES = [
  { value: "side_effect", icon: "💊" },
  { value: "allergic", icon: "🤧" },
  { value: "adverse_event", icon: "⚠️" },
  { value: "medication_error", icon: "❌" },
  { value: "other", icon: "📝" },
];

const OUTCOME_OPTIONS = [
  "recovered",
  "recovering",
  "not_recovered",
  "unknown",
];

const SideEffectTracker = ({ setIsAuthenticated }) => {
  const { t } = useLanguage();
  const [sideEffects, setSideEffects] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState(null);
  const [filterSeverity, setFilterSeverity] = useState("");
  const [filterResolved, setFilterResolved] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const defaultForm = {
    reaction_type: "side_effect",
    severity: "mild",
    medication_name: "",
    medication_dosage: "",
    symptoms: "",
    onset_time: new Date().toISOString().slice(0, 16),
    duration: "",
    treatment_given: "",
    outcome: "unknown",
    reported_by: "patient",
  };

  const [form, setForm] = useState(defaultForm);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchSideEffects = useCallback(async () => {
    try {
      const filters = {};
      if (filterSeverity) filters.severity = filterSeverity;
      if (filterResolved !== "") filters.is_resolved = filterResolved;
      const data = await sideEffectAPI.getAll(filters);
      setSideEffects(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error("Failed to fetch side effects:", err);
      showToast(t("sideEffects.fetchError"), "error");
    }
  }, [filterSeverity, filterResolved, t]);

  const fetchMedicines = useCallback(async () => {
    try {
      const data = await medicineAPI.getAll();
      setMedicines(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error("Failed to fetch medicines:", err);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchSideEffects(), fetchMedicines()]);
      setLoading(false);
    };
    load();
  }, [fetchSideEffects, fetchMedicines]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.symptoms.trim()) {
      showToast(t("sideEffects.symptomsRequired"), "error");
      return;
    }
    if (!form.medication_name.trim()) {
      showToast(t("sideEffects.medicineRequired"), "error");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        onset_time: form.onset_time ? new Date(form.onset_time).toISOString() : null,
      };
      await sideEffectAPI.create(payload);
      showToast(t("sideEffects.loggedSuccess"));
      setForm(defaultForm);
      setShowForm(false);
      await fetchSideEffects();
    } catch (err) {
      console.error("Failed to log side effect:", err);
      showToast(t("sideEffects.logError"), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (id) => {
    try {
      await sideEffectAPI.update(id, {
        is_resolved: true,
        resolved_date: new Date().toISOString(),
        outcome: "recovered",
      });
      showToast(t("sideEffects.resolvedSuccess"));
      await fetchSideEffects();
    } catch (err) {
      console.error("Failed to resolve side effect:", err);
      showToast(t("sideEffects.resolveError"), "error");
    }
  };

  const handleMedicineSelect = (medicineName) => {
    const medicine = medicines.find((m) => m.name === medicineName);
    setForm((prev) => ({
      ...prev,
      medication_name: medicineName,
      medication_dosage: medicine ? medicine.dosage || "" : "",
    }));
  };

  const getSeverityStyle = (severity) => {
    const opt = SEVERITY_OPTIONS.find((o) => o.value === severity);
    return opt ? opt.color : "bg-gray-100 text-gray-800";
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const activeCount = sideEffects.filter((s) => !s.is_resolved).length;
  const resolvedCount = sideEffects.filter((s) => s.is_resolved).length;

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
              {t("sideEffects.title")}
            </h1>
            <p
              className="mt-1 text-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("sideEffects.subtitle")}
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-medium transition-colors shadow-sm flex items-center gap-2"
          >
            {showForm ? (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                {t("common.cancel")}
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t("sideEffects.logNew")}
              </>
            )}
          </button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div
            className="rounded-2xl p-5 border"
            style={{
              background: "var(--card-bg)",
              borderColor: "var(--border-color)",
            }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-100 rounded-lg text-teal-600 text-xl">
                📋
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                  {sideEffects.length}
                </p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {t("sideEffects.totalLogged")}
                </p>
              </div>
            </div>
          </div>
          <div
            className="rounded-2xl p-5 border"
            style={{
              background: "var(--card-bg)",
              borderColor: "var(--border-color)",
            }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg text-amber-600 text-xl">
                ⚡
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                  {activeCount}
                </p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {t("sideEffects.activeEffects")}
                </p>
              </div>
            </div>
          </div>
          <div
            className="rounded-2xl p-5 border"
            style={{
              background: "var(--card-bg)",
              borderColor: "var(--border-color)",
            }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg text-green-600 text-xl">
                ✅
              </div>
              <div>
                <p className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                  {resolvedCount}
                </p>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {t("sideEffects.resolvedEffects")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Log New Side Effect Form */}
        {showForm && (
          <div
            className="rounded-2xl border p-6 mb-8 animate-fade-in"
            style={{
              background: "var(--card-bg)",
              borderColor: "var(--border-color)",
            }}
          >
            <h2
              className="text-lg font-semibold mb-5"
              style={{ color: "var(--text-primary)" }}
            >
              {t("sideEffects.logNewTitle")}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Row 1: Medicine & Reaction Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {t("sideEffects.medicine")} *
                  </label>
                  <select
                    value={form.medication_name}
                    onChange={(e) => handleMedicineSelect(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border text-sm transition-colors focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    style={{
                      background: "var(--input-bg)",
                      borderColor: "var(--border-color)",
                      color: "var(--text-primary)",
                    }}
                    required
                  >
                    <option value="">{t("sideEffects.selectMedicine")}</option>
                    {medicines.map((med) => (
                      <option key={med.id} value={med.name}>
                        {med.name} {med.dosage ? `(${med.dosage})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {t("sideEffects.reactionType")}
                  </label>
                  <select
                    value={form.reaction_type}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, reaction_type: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 rounded-xl border text-sm transition-colors focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    style={{
                      background: "var(--input-bg)",
                      borderColor: "var(--border-color)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {REACTION_TYPES.map((rt) => (
                      <option key={rt.value} value={rt.value}>
                        {rt.icon} {t(`sideEffects.reactionTypes.${rt.value}`)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Severity */}
              <div>
                <label
                  className="block text-sm font-medium mb-2"
                  style={{ color: "var(--text-primary)" }}
                >
                  {t("sideEffects.severity")}
                </label>
                <div className="flex flex-wrap gap-2">
                  {SEVERITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({ ...prev, severity: opt.value }))
                      }
                      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                        form.severity === opt.value
                          ? `${opt.color} ring-2 ring-offset-1 ring-current`
                          : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      {t(`sideEffects.severityLevels.${opt.value}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 3: Symptoms */}
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: "var(--text-primary)" }}
                >
                  {t("sideEffects.symptoms")} *
                </label>
                <textarea
                  value={form.symptoms}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, symptoms: e.target.value }))
                  }
                  rows={3}
                  placeholder={t("sideEffects.symptomsPlaceholder")}
                  className="w-full px-4 py-2.5 rounded-xl border text-sm transition-colors focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
                  style={{
                    background: "var(--input-bg)",
                    borderColor: "var(--border-color)",
                    color: "var(--text-primary)",
                  }}
                  required
                />
              </div>

              {/* Row 4: Onset Time & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {t("sideEffects.onsetTime")}
                  </label>
                  <input
                    type="datetime-local"
                    value={form.onset_time}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, onset_time: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 rounded-xl border text-sm transition-colors focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    style={{
                      background: "var(--input-bg)",
                      borderColor: "var(--border-color)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {t("sideEffects.duration")}
                  </label>
                  <input
                    type="text"
                    value={form.duration}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, duration: e.target.value }))
                    }
                    placeholder={t("sideEffects.durationPlaceholder")}
                    className="w-full px-4 py-2.5 rounded-xl border text-sm transition-colors focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    style={{
                      background: "var(--input-bg)",
                      borderColor: "var(--border-color)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>
              </div>

              {/* Row 5: Treatment & Outcome */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {t("sideEffects.treatmentGiven")}
                  </label>
                  <textarea
                    value={form.treatment_given}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        treatment_given: e.target.value,
                      }))
                    }
                    rows={2}
                    placeholder={t("sideEffects.treatmentPlaceholder")}
                    className="w-full px-4 py-2.5 rounded-xl border text-sm transition-colors focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
                    style={{
                      background: "var(--input-bg)",
                      borderColor: "var(--border-color)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {t("sideEffects.outcome")}
                  </label>
                  <select
                    value={form.outcome}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, outcome: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 rounded-xl border text-sm transition-colors focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    style={{
                      background: "var(--input-bg)",
                      borderColor: "var(--border-color)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {OUTCOME_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {t(`sideEffects.outcomes.${o}`)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setForm(defaultForm);
                    setShowForm(false);
                  }}
                  className="px-5 py-2.5 rounded-xl border text-sm font-medium transition-colors hover:bg-gray-50"
                  style={{
                    borderColor: "var(--border-color)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-300 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <svg
                        className="animate-spin h-4 w-4"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      {t("common.saving")}
                    </span>
                  ) : (
                    t("sideEffects.submitLog")
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-4 py-2 rounded-xl border text-sm"
            style={{
              background: "var(--input-bg)",
              borderColor: "var(--border-color)",
              color: "var(--text-primary)",
            }}
          >
            <option value="">{t("sideEffects.allSeverities")}</option>
            {SEVERITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {t(`sideEffects.severityLevels.${opt.value}`)}
              </option>
            ))}
          </select>
          <select
            value={filterResolved}
            onChange={(e) => setFilterResolved(e.target.value)}
            className="px-4 py-2 rounded-xl border text-sm"
            style={{
              background: "var(--input-bg)",
              borderColor: "var(--border-color)",
              color: "var(--text-primary)",
            }}
          >
            <option value="">{t("sideEffects.allStatus")}</option>
            <option value="false">{t("sideEffects.statusActive")}</option>
            <option value="true">{t("sideEffects.statusResolved")}</option>
          </select>
        </div>

        {/* Side Effects List */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sideEffects.length === 0 ? (
          <div
            className="rounded-2xl border p-12 text-center"
            style={{
              background: "var(--card-bg)",
              borderColor: "var(--border-color)",
            }}
          >
            <div className="text-5xl mb-4">🩺</div>
            <h3
              className="text-lg font-semibold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              {t("sideEffects.noEffects")}
            </h3>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              {t("sideEffects.noEffectsDesc")}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {sideEffects.map((effect) => {
              const isExpanded = expandedId === effect.id;
              const reactionType = REACTION_TYPES.find(
                (rt) => rt.value === effect.reaction_type
              );

              return (
                <div
                  key={effect.id}
                  className="rounded-2xl border overflow-hidden transition-shadow hover:shadow-md"
                  style={{
                    background: "var(--card-bg)",
                    borderColor: "var(--border-color)",
                  }}
                >
                  {/* Card Header */}
                  <div
                    className="p-5 cursor-pointer"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : effect.id)
                    }
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="text-2xl flex-shrink-0">
                          {reactionType?.icon || "📝"}
                        </span>
                        <div className="min-w-0">
                          <h3
                            className="font-semibold truncate"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {effect.medication_name}
                          </h3>
                          <p
                            className="text-sm mt-0.5 line-clamp-2"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            {effect.symptoms}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium border ${getSeverityStyle(
                            effect.severity
                          )}`}
                        >
                          {t(`sideEffects.severityLevels.${effect.severity}`)}
                        </span>
                        {effect.is_resolved ? (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-300">
                            {t("sideEffects.resolved")}
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-300">
                            {t("sideEffects.active")}
                          </span>
                        )}
                        <svg
                          className={`w-5 h-5 transition-transform ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                          style={{ color: "var(--text-secondary)" }}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs" style={{ color: "var(--text-secondary)" }}>
                      <span>
                        {t("sideEffects.reported")}: {formatDate(effect.reported_date)}
                      </span>
                      {effect.onset_time && (
                        <span>
                          {t("sideEffects.onset")}: {formatDate(effect.onset_time)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div
                      className="px-5 pb-5 pt-0 border-t animate-fade-in"
                      style={{ borderColor: "var(--border-color)" }}
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                        {effect.medication_dosage && (
                          <div>
                            <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                              {t("sideEffects.dosage")}
                            </p>
                            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                              {effect.medication_dosage}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                            {t("sideEffects.reactionType")}
                          </p>
                          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                            {reactionType?.icon}{" "}
                            {t(`sideEffects.reactionTypes.${effect.reaction_type}`)}
                          </p>
                        </div>
                        {effect.duration && (
                          <div>
                            <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                              {t("sideEffects.duration")}
                            </p>
                            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                              {effect.duration}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                            {t("sideEffects.outcome")}
                          </p>
                          <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                            {t(`sideEffects.outcomes.${effect.outcome}`)}
                          </p>
                        </div>
                        {effect.treatment_given && (
                          <div className="sm:col-span-2">
                            <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                              {t("sideEffects.treatmentGiven")}
                            </p>
                            <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                              {effect.treatment_given}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      {!effect.is_resolved && (
                        <div className="mt-5 flex justify-end">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleResolve(effect.id);
                            }}
                            className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {t("sideEffects.markResolved")}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SideEffectTracker;
