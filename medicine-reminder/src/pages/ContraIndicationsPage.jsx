
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useContraindications } from "../hooks/useContraindications";
import { useLanguage } from "../i18n";
import BaseLayout from "../components/BaseLayout";

const ContraIndicationsPage = ({ setIsAuthenticated }) => {
  const { name } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const { data, loading, error, searchContra } = useContraindications();

  useEffect(() => {
    if (name) {
      setQuery(name);
      searchContra(name);
    }
  }, [name]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim() !== "") {
      searchContra(query);
    }
  };

  return (
    <BaseLayout showNavigation={true} setIsAuthenticated={setIsAuthenticated}>
      <div className="max-w-3xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-1 bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1.5 rounded-lg text-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t("contraIndications.back")}
        </button>

        <h1 className="text-2xl font-bold mb-4">{t("contraIndications.title")}</h1>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 mb-6">
          <input
            type="text"
            placeholder={t("contraIndications.enterMedicineName")}
            className="border p-2 rounded flex-1"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            type="submit"
            className="bg-teal-600 text-white px-4 py-2 rounded flex-shrink-0"
          >
            {t("contraIndications.search")}
          </button>
        </form>

        {loading && <p>{t("contraIndications.loadingInformation")}</p>}
        {error && <p className="text-red-600">{error}</p>}

        {data && (
          <div className="space-y-6">
            {data.contraindications && (
              <section className="bg-white p-4 border rounded shadow-sm">
                <h2 className="font-semibold text-lg mb-2">{t("contraIndications.contraIndicationsSection")}</h2>
                <p className="whitespace-pre-line text-gray-800">
                  {data.contraindications}
                </p>
              </section>
            )}

            {data.interactions && (
              <section className="bg-white p-4 border rounded shadow-sm">
                <h2 className="font-semibold text-lg mb-2">{t("contraIndications.drugInteractions")}</h2>
                <p className="whitespace-pre-line text-gray-800">
                  {data.interactions}
                </p>
              </section>
            )}

            {data.warnings && (
              <section className="bg-white p-4 border rounded shadow-sm">
                <h2 className="font-semibold text-lg mb-2">{t("contraIndications.warnings")}</h2>
                <p className="whitespace-pre-line text-gray-800">
                  {data.warnings}
                </p>
              </section>
            )}
          </div>
        )}
      </div>
    </BaseLayout>
  );
};

export default ContraIndicationsPage;