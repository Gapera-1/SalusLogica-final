import React from "react";
import { useLanguage } from "../i18n";

function LoginForm({
  username,
  password,
  error,
  setUsername,
  setPassword,
  handleLogin,
  setIsSignup,
}) {
  const { t } = useLanguage();
  return (
    <form onSubmit={handleLogin} className="flex flex-col gap-3 p-6 bg-white bg-opacity-90  rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-2 text-center">{t('login.title')}</h2>

      <input
        type="text"
        placeholder={t('login.enterUsername')}
        className="border px-3 py-2 rounded"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

      <input
        type="password"
        placeholder={t('login.enterPassword')}
        className="border px-3 py-2 rounded"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {error && <div className="text-red-500 text-sm">{error}</div>}

      <button
        type="submit"
        className="bg-teal-500 text-white py-2 rounded hover:bg-teal-600 transition"
      >
        {t('login.signinButton')}
      </button>

      <p className="text-sm text-center mt-2">
        {t('login.noAccount')}{" "}
        <button
          type="button"
          className="text-green-600 hover:underline"
          onClick={() => setIsSignup(true)}
        >
          {t('login.signup')}
        </button>
      </p>
    </form>
  );
}

export default LoginForm;