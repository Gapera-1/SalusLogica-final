import React, { useState, useEffect } from "react";
import BaseLayout from "../components/BaseLayout";

const PharmacyAdminAdverseReactions = ({ setIsAuthenticated }) => {
  const [reactions, setReactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterResolved, setFilterResolved] = useState("all");

  useEffect(() => {
    const fetchReactions = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (filterSeverity !== "all") {
          params.append("severity", filterSeverity);
        }
        if (filterResolved !== "all") {
          params.append("is_resolved", filterResolved === "resolved" ? "true" : "false");
        }

        const response = await fetch(
          `http://127.0.0.1:8000/api/pharmacy-admin/adverse-reactions/?${params}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Token ${localStorage.getItem("access_token")}`
            }
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch adverse reactions");
        }

        const data = await response.json();
        setReactions(Array.isArray(data) ? data : data.results || []);
      } catch (err) {
        console.error("Error fetching adverse reactions:", err);
        setError(err.message || "Failed to load adverse reactions");
      } finally {
        setLoading(false);
      }
    };

    fetchReactions();
  }, [filterSeverity, filterResolved]);

  if (loading) {
    return (
      <BaseLayout showNavigation={true} setIsAuthenticated={setIsAuthenticated}>
        <div className="flex flex-col items-center justify-center min-h-96">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading adverse reactions...</p>
        </div>
      </BaseLayout>
    );
  }

  return (
    <BaseLayout showNavigation={true} setIsAuthenticated={setIsAuthenticated}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Adverse Reactions</h1>
          <p className="mt-2 text-gray-600">
            Monitor adverse reactions reported by your patients
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Severity Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Severity
              </label>
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Severities</option>
                <option value="mild">Mild</option>
                <option value="moderate">Moderate</option>
                <option value="severe">Severe</option>
              </select>
            </div>

            {/* Resolution Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Status
              </label>
              <select
                value={filterResolved}
                onChange={(e) => setFilterResolved(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="unresolved">Unresolved</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>
        </div>

        {/* Adverse Reactions List */}
        {reactions.length > 0 ? (
          <div className="space-y-4">
            {reactions.map((reaction) => (
              <div 
                key={reaction.id} 
                className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
                  reaction.severity === 'severe'
                    ? 'border-red-500'
                    : reaction.severity === 'moderate'
                    ? 'border-yellow-500'
                    : 'border-blue-500'
                }`}
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Left Section */}
                  <div>
                    <h3 className="font-semibold text-gray-900">{reaction.patient_name || 'Patient'}</h3>
                    <p className="text-sm text-gray-600">{reaction.medicine_name || 'Unknown Medicine'}</p>
                  </div>

                  {/* Middle Section */}
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Reaction Type</p>
                      <p className="text-sm text-gray-900 capitalize">{reaction.reaction_type}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Description</p>
                      <p className="text-sm text-gray-900">{reaction.description}</p>
                    </div>
                  </div>

                  {/* Right Section */}
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          reaction.severity === 'severe'
                            ? 'bg-red-100 text-red-800'
                            : reaction.severity === 'moderate'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {reaction.severity?.charAt(0).toUpperCase() + reaction.severity?.slice(1) || 'Unknown'}
                      </span>
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          reaction.is_resolved
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {reaction.is_resolved ? 'Resolved' : 'Unresolved'}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Reported</p>
                      <p className="text-sm text-gray-900">
                        {reaction.reported_date
                          ? new Date(reaction.reported_date).toLocaleDateString()
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 flex gap-2 border-t pt-4">
                  <button
                    onClick={() => alert(`View details for reaction ${reaction.id}`)}
                    className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                  >
                    View Details
                  </button>
                  {!reaction.is_resolved && (
                    <button
                      onClick={() => alert(`Mark reaction ${reaction.id} as resolved`)}
                      className="text-green-600 hover:text-green-900 text-sm font-medium"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-gray-900">No adverse reactions found</h3>
            <p className="mt-1 text-sm text-gray-600">
              {filterSeverity !== "all" || filterResolved !== "all"
                ? "No adverse reactions match your filters"
                : "No adverse reactions reported yet"}
            </p>
          </div>
        )}
      </div>
    </BaseLayout>
  );
};

export default PharmacyAdminAdverseReactions;
