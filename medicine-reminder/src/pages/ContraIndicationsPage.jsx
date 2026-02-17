
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useContraindications } from "../hooks/useContraindications";
import { useLanguage } from "../i18n";

const ContraIndicationsPage = () => {
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
    <>
    {/* ✅ BACK BUTTON — now uses navigate(-1) */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded"
      >
        {t("contraIndications.back")}
      </button>
    <div className="p-6 max-w-3xl mx-auto relative">

      

      <h1 className="text-2xl font-bold mb-4">{t("contraIndications.title")}</h1>

      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder={t("contraIndications.enterMedicineName")}
          className="border p-2 rounded flex-1"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="submit"
          className="bg-teal-600 text-white px-4 py-2 rounded"
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
    </>
  );
};

export default ContraIndicationsPage;