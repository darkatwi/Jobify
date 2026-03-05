import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/ReviewPage.css";

const API_URL = import.meta.env.VITE_API_URL;

function getToken() {
  // preferred key
  let t = localStorage.getItem("jobify_token");
  if (t) return String(t).replaceAll('"', ""); // in case it was JSON.stringified

  // fallback: stored user object
  try {
    const u = JSON.parse(localStorage.getItem("jobify_user") || "{}");
    if (u?.token) return String(u.token).replaceAll('"', "");
  } catch {}

  return null;
}

export default function AssessmentRulesPage() {
  const { applicationId } = useParams();
  const navigate = useNavigate();

  const [webcamConsent, setWebcamConsent] = useState(false);
  const [agreeRules, setAgreeRules] = useState(false);
  const [loading, setLoading] = useState(false);

  const [rulesDataLoading, setRulesDataLoading] = useState(true);
  const [rulesDataError, setRulesDataError] = useState("");
  const [rulesData, setRulesData] = useState({
    timeLimitSeconds: null,
    mcqCount: null,
    challengeCount: null,
  });

  useEffect(() => {
    const load = async () => {
      const token = getToken();
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        setRulesDataLoading(true);
        setRulesDataError("");

        // Swagger shows /api/Applications/{applicationId}
        const res = await fetch(`${API_URL}/api/Applications/${applicationId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const t = await res.text().catch(() => "");
          throw new Error(t || `Failed to load application (${res.status})`);
        }

        const data = await res.json();

        // your backend likely returns:
        // { hasAssessment, attempt: { ... }, assessment: { questions }, ... }
        const attempt = data?.attempt;
        const assessment = data?.assessment;

        const questions = assessment?.questions ?? [];

        const mcqFromQuestions = Array.isArray(questions)
          ? questions.filter((q) => (q?.type || "").toLowerCase() === "mcq").length
          : null;

        const chFromQuestions = Array.isArray(questions)
          ? questions.filter((q) => {
              const t = (q?.type || "").toLowerCase();
              return t === "code" || t === "design" || t === "challenge";
            }).length
          : null;

        setRulesData({
          timeLimitSeconds:
            attempt?.timeLimitSeconds ??
            data?.assessmentTimeLimitSeconds ??
            assessment?.timeLimitSeconds ??
            null,

          mcqCount:
            attempt?.mcqCount ??
            data?.assessmentMcqCount ??
            mcqFromQuestions ??
            null,

          challengeCount:
            attempt?.challengeCount ??
            data?.assessmentChallengeCount ??
            chFromQuestions ??
            null,
        });
      } catch (e) {
        setRulesDataError(e?.message || "Failed to load assessment rules");
      } finally {
        setRulesDataLoading(false);
      }
    };

    if (applicationId) load();
  }, [applicationId, navigate]);

  const rules = useMemo(() => {
    const seconds = rulesData.timeLimitSeconds;
    const minutes = typeof seconds === "number" ? Math.round(seconds / 60) : 45;

    const mcq = typeof rulesData.mcqCount === "number" ? rulesData.mcqCount : 5;
    const ch = typeof rulesData.challengeCount === "number" ? rulesData.challengeCount : 2;

    return [
      `You will have ${minutes} minutes to complete the assessment.`,
      `The assessment consists of ${mcq} Multiple Choice Questions and ${ch} Code/Design challenges.`,
      "Once started, the timer cannot be paused.",
      "Do not refresh the page or switch tabs frequently.",
      "Ensure you have a stable internet connection.",
    ];
  }, [rulesData]);

  const antiCheat = useMemo(
    () => [
      "Copy/Paste may be disabled during the assessment.",
      "Frequent tab switching or unusual behavior may be detected and flagged.",
      "Questions may be randomized for each candidate.",
      "Hidden test cases are used for code challenges.",
      "Time limit is enforced by the backend.",
      "Webcam snapshots will be captured every 2–3 minutes to help prevent cheating.",
    ],
    []
  );

  const startAssessment = async () => {
    const token = getToken();
    if (!token) {
      navigate("/login");
      return;
    }

    if (!agreeRules || !webcamConsent) {
      alert("You must agree to the rules and enable webcam monitoring to proceed.");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/api/Applications/${applicationId}/assessment/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ webcamConsent: true }),
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || `Failed to start assessment (${res.status})`);
      }

      // IMPORTANT: frontend route is plural + lowercase
      navigate(`/applications/${applicationId}/assessment`);
    } catch (e) {
      alert(e?.message || "Failed to start assessment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rulesPage">
      <div className="rulesShell">
        <div className="rulesHeader">
          <h1>Assessment Rules & Consent</h1>
          <p>Please read carefully before starting. Once started, the timer will run continuously.</p>
        </div>

        {rulesDataLoading && (
          <div className="rulesCard">
            <p className="muted">Loading assessment settings…</p>
          </div>
        )}

        {rulesDataError && (
          <div className="rulesCard">
            <p className="muted">Couldn’t load rules from backend. Using defaults.</p>
            <p className="muted" style={{ marginTop: 6 }}>
              {rulesDataError}
            </p>
          </div>
        )}

        <section className="rulesCard">
          <h2>Assessment Rules</h2>
          <ul className="rulesList">
            {rules.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </section>

        <section className="rulesCard">
          <h2>Anti-Cheating Measures</h2>
          <p className="muted">These measures ensure fairness and integrity during the assessment.</p>
          <ul className="rulesList">
            {antiCheat.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </section>

        <section className="rulesCard">
          <h2>Mandatory Consent</h2>

          <label className="checkRow">
            <input type="checkbox" checked={webcamConsent} onChange={(e) => setWebcamConsent(e.target.checked)} />
            <div>
              <div className="checkTitle">Webcam Monitoring (Required)</div>
              <div className="checkSub">Webcam snapshots will be taken every 2–3 minutes during the assessment.</div>
            </div>
          </label>

          <label className="checkRow">
            <input type="checkbox" checked={agreeRules} onChange={(e) => setAgreeRules(e.target.checked)} />
            <div>
              <div className="checkTitle">I agree to the rules</div>
              <div className="checkSub">I understand the timer cannot be paused and unusual behavior may be flagged.</div>
            </div>
          </label>
        </section>

        <div className="rulesActions">
          <button className="btnOutline" onClick={() => navigate(-1)}>
            Back
          </button>

          <button className="btnPrimary" onClick={startAssessment} disabled={!webcamConsent || !agreeRules || loading}>
            {loading ? "Starting..." : "Start Assessment →"}
          </button>
        </div>
      </div>
    </div>
  );
}
