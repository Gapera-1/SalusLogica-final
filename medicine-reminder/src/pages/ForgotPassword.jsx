import React, { useState } from "react";
import { Link } from "react-router-dom";
import { authAPI } from "../services/api";
import { useLanguage } from "../i18n";

const ForgotPassword = () => {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError(t("forgotPassword.emailRequired"));
      return;
    }

    if (!isValidEmail(email)) {
      setError(t("forgotPassword.emailInvalid"));
      return;
    }

    setLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setSubmitted(true);
    } catch (err) {
      const errorMsg =
        err.response?.data?.error || err.message || t("forgotPassword.somethingWentWrong");
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Header */}
            <div className="px-6 py-8 text-center bg-teal-500">
              <div className="text-5xl mb-3">{"\u{1F4E7}"}</div>
              <h1 className="text-2xl font-bold text-white">{t("forgotPassword.checkYourEmail")}</h1>
            </div>

            {/* Body */}
            <div className="px-6 py-8 text-center">
              <p className="text-gray-600 mb-2">
                {t("forgotPassword.emailSentMessage")} (<strong>{email}</strong>)
              </p>
              <p className="text-sm text-gray-500 mb-6">
                {t("forgotPassword.linkExpiry")}
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setEmail("");
                  }}
                  className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-colors"
                >
                  {t("forgotPassword.tryDifferentEmail")}
                </button>

                <Link
                  to="/login"
                  className="block w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors text-center"
                >
                  {t("forgotPassword.backToLogin")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            {t("forgotPassword.resetYourPassword")}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {t("forgotPassword.subtitle")}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              {t("forgotPassword.emailLabel")}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError("");
              }}
              className={`appearance-none relative block w-full px-3 py-2 border ${
                error ? "border-red-300" : "border-gray-300"
              } placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500 focus:z-10 sm:text-sm`}
              placeholder={t("forgotPassword.emailPlaceholder")}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t("forgotPassword.sending") : t("forgotPassword.sendResetLink")}
            </button>
          </div>

          <div className="text-center">
            <Link
              to="/login"
              className="font-medium text-teal-600 hover:text-teal-500 text-sm"
            >
              {t("forgotPassword.backToLogin")}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
