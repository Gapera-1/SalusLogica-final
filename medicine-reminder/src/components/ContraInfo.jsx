import React, { useEffect } from "react";
import { useContraindications } from "../hooks/useContraindications";

const ContraInfo = ({ medicineName }) => {
  const { data, loading, error, searchContra } = useContraindications();

  useEffect(() => {
    if (medicineName) {
      searchContra(medicineName);
    }
  }, [medicineName]);

  return (
    <div className="mt-4 p-4 border rounded bg-white shadow-sm">
      <h3 className="font-semibold text-lg mb-2">
        Safety Information for: {medicineName}
      </h3>

      {loading && <p>Loading contraindications…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {data && (
        <div className="space-y-4">
          {data.contraindications && (
            <section>
              <h4 className="font-semibold">Contraindications</h4>
              <p className="text-gray-700 whitespace-pre-line">
                {data.contraindications}
              </p>
            </section>
          )}

          {data.interactions && (
            <section>
              <h4 className="font-semibold">Drug Interactions</h4>
              <p className="text-gray-700 whitespace-pre-line">
                {data.interactions}
              </p>
            </section>
          )}

          {data.warnings && (
            <section>
              <h4 className="font-semibold">Warnings</h4>
              <p className="text-gray-700 whitespace-pre-line">
                {data.warnings}
              </p>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default ContraInfo;