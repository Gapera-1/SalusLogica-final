import { useState } from "react";

export function useContraindications() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const searchContra = async (medicineName) => {
    if (!medicineName) return;

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const encoded = encodeURIComponent(medicineName.trim());
      const url = `https://api.fda.gov/drug/label.json?search=contraindications:${encoded}&limit=1`;

      const response = await fetch(url);
      if (!response.ok) throw new Error("No data found");

      const json = await response.json();
      if (!json.results || json.results.length === 0)
        throw new Error("No contraindication info available");

      const result = json.results[0];

      setData({
        contraindications: result.contraindications?.[0] || null,
        warnings: result.warnings?.[0] || null,
        interactions: result.drug_interactions?.[0] || null,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, searchContra };
}