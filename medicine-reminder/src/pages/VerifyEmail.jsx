import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { authAPI } from "../services/api";
import { useLanguage } from "../i18n";

const VerifyEmail = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [status, setStatus] = useState("verifying"); // verifying, success, error, expired
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) return;
    
    let cancelled = false;
    
    (async () => {
      try {
        const response = await authAPI.verifyEmail(token);
        if (!cancelled) {
          setStatus("success");
          setMessage(response.message || t("verifyEmail.successMessage"));
        }
      } catch (error) {
        if (!cancelled) {
          const errorData = error.response?.data;
          const errorMsg = errorData?.error || error.message || t("verifyEmail.failedMessage");
          if (errorMsg.toLowerCase().includes("expired")) {
            setStatus("expired");
          } else {
            setStatus("error");
          }
          setMessage(errorMsg);
        }
      }
    })();
    
    return () => { cancelled = true; };
  }, [token, t]);

  const handleGoToLogin = () => {
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div
            className={`px-6 py-8 text-center ${
              status === "success"
                ? "bg-green-500"
                : status === "verifying"
                ? "bg-teal-500"
                : "bg-red-500"
            }`}
          >
            <div className="text-5xl mb-3">
              {status === "verifying" && "\u23F3"}
              {status === "success" && "\u2705"}
              {status === "error" && "\u274C"}
              {status === "expired" && "\u23F0"}
            </div>
            <h1 className="text-2xl font-bold text-white">
              {status === "verifying" && t("verifyEmail.verifying")}
              {status === "success" && t("verifyEmail.verified")}
              {status === "error" && t("verifyEmail.failed")}
              {status === "expired" && t("verifyEmail.expired")}
            </h1>
          </div>

          {/* Body */}
          <div className="px-6 py-8 text-center">
            <p className="text-gray-600 mb-6">{message}</p>

            {status === "verifying" && (
              <div className="flex justify-center">
                <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {status === "success" && (
              <button
                onClick={handleGoToLogin}
                className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
              >
                {t("verifyEmail.goToLogin")}
              </button>
            )}

            {(status === "error" || status === "expired") && (
              <div className="space-y-3">
                <button
                  onClick={handleGoToLogin}
                  className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-colors"
                >
                  {t("verifyEmail.goToLogin")}
                </button>
                <p className="text-sm text-gray-500">
                  {t("verifyEmail.requestNewLink")}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
