import { useState } from "react";

export default function Match() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState([]);

  async function getRecommendations() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:5159/api/Recommendation/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skills: [
            { name: "JavaScript", weight: 1 },
            { name: "React", weight: 1 }
          ]
        })
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Request failed");
      }

      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>Match</h1>
      <p>Click to test your recommendation API.</p>

      <button onClick={getRecommendations} disabled={loading}>
        {loading ? "Loading..." : "Get Recommendations"}
      </button>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <div style={{ marginTop: 16 }}>
        {results.length === 0 ? (
          <p>No results yet.</p>
        ) : (
          <ul>
            {results.map((r) => (
              <li key={r.opportunityId ?? r.jobId}>
                <b>{r.title}</b> — score: {r.score}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}