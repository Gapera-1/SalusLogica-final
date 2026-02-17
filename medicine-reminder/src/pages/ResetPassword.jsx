import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { authAPI } from "../services/api";
import { useLanguage } from "../i18n";

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [tokenStatus, setTokenStatus] = useState("validating"); // validating, valid, invalid, expired, used
  const [tokenError, setTokenError] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Validate token on mount
  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    (async () => {
      try {
        await authAPI.validateResetToken(token);
        if (!cancelled) {
          setTokenStatus("valid");
        }
      } catch (err) {
        if (!cancelled) {
          const errorData = err.response?.data;
          const errorMsg = errorData?.error || t("resetPassword.invalidLink");

          if (errorMsg.toLowerCase().includes("expired")) {
            setTokenStatus("expired");
          } else if (errorMsg.toLowerCase().includes("already been used")) {
            setTokenStatus("used");
          } else {
            setTokenStatus("invalid");
          }
          setTokenError(errorMsg);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, t]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!newPassword) {
      setError(t("resetPassword.passwordRequired"));
      return;
    }

    if (newPassword.length < 8) {
      setError(t("resetPassword.passwordMinLength"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t("resetPassword.passwordsMustMatch"));
      return;
    }

    setLoading(true);
    try {
      await authAPI.resetPassword(token, newPassword, confirmPassword);
      setSuccess(true);
    } catch (err) {
      const errorMsg =
        err.response?.data?.error || err.message || t("resetPassword.failedToReset");
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Token validation loading state
  if (tokenStatus === "validating") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-8 text-center bg-teal-500">
              <div className="text-5xl mb-3">{"\u23F3"}</div>
              <h1 className="text-2xl font-bold text-white">{t("resetPassword.validating")}</h1>
            </div>
            <div className="px-6 py-8 flex justify-center">
              <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Token invalid / expired / used
  if (tokenStatus !== "valid" && !success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-8 text-center bg-red-500">
              <div className="text-5xl mb-3">
                {tokenStatus === "expired" ? "\u23F0" : tokenStatus === "used" ? "\uD83D\uDD12" : "\u274C"}
              </div>
              <h1 className="text-2xl font-bold text-white">
                {tokenStatus === "expired"
                  ? t("resetPassword.linkExpired")
                  : tokenStatus === "used"
                  ? t("resetPassword.linkUsed")
                  : t("resetPassword.invalidLinkTitle")}
              </h1>
            </div>
            <div className="px-6 py-8 text-center">
              <p className="text-gray-600 mb-6">{tokenError}</p>
              <div className="space-y-3">
                <Link
                  to="/forgot-password"
                  className="block w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-colors text-center"
                >
                  {t("resetPassword.requestNewLink")}
                </Link>
                <Link
                  to="/login"
                  className="block w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors text-center"
                >
                  {t("resetPassword.backToLogin")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-8 text-center bg-green-500">
              <div className="text-5xl mb-3">{"\u2705"}</div>
              <h1 className="text-2xl font-bold text-white">{t("resetPassword.successTitle")}</h1>
            </div>
            <div className="px-6 py-8 text-center">
              <p className="text-gray-600 mb-6">
                {t("resetPassword.successMessage")}
              </p>
              <button
                onClick={() => navigate("/login")}
                className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
              >
                {t("resetPassword.goToLogin")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Reset form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            {t("resetPassword.title")}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {t("resetPassword.subtitle")}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                {t("resetPassword.newPassword")}
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  name="newPassword"
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (error) setError("");
                  }}
                  className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm pr-10"
                  placeholder={t("resetPassword.newPasswordPlaceholder")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                {t("resetPassword.confirmNewPassword")}
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError("");
                }}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                placeholder={t("resetPassword.confirmPasswordPlaceholder")}
              />
            </div>
          </div>

          {/* Password strength indicator */}
          {newPassword && (
            <div className="space-y-1">
              <div className="flex gap-1">
                <div
                  className={`h-1 flex-1 rounded ${
                    newPassword.length >= 8 ? "bg-green-500" : "bg-red-400"
                  }`}
                />
                <div
                  className={`h-1 flex-1 rounded ${
                    /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)
                      ? "bg-green-500"
                      : "bg-gray-300"
                  }`}
                />
                <div
                  className={`h-1 flex-1 rounded ${
                    /[0-9]/.test(newPassword) ? "bg-green-500" : "bg-gray-300"
                  }`}
                />
                <div
                  className={`h-1 flex-1 rounded ${
                    /[^A-Za-z0-9]/.test(newPassword) ? "bg-green-500" : "bg-gray-300"
                  }`}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{t("resetPassword.strengthChars")}</span>
                <span>{t("resetPassword.strengthMixedCase")}</span>
                <span>{t("resetPassword.strengthNumber")}</span>
                <span>{t("resetPassword.strengthSymbol")}</span>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t("resetPassword.resetting") : t("resetPassword.resetButton")}
            </button>
          </div>

          <div className="text-center">
            <Link
              to="/login"
              className="font-medium text-teal-600 hover:text-teal-500 text-sm"
            >
              {t("resetPassword.backToLogin")}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
