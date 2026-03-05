import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../api/api";
import "../styles/AssesmentPage.css";

function msToClock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function parseUtcDate(isoMaybeNoZ) {
  if (!isoMaybeNoZ) return null;
  const s = String(isoMaybeNoZ);
  const normalized = /Z$/.test(s) || /[+-]\d\d:\d\d$/.test(s) ? s : `${s}Z`;
  const t = Date.parse(normalized);
  return Number.isFinite(t) ? t : null;
}

const LANGUAGE_NAME = {
  71: "Python 3",
  63: "JavaScript (Node.js)",
  62: "Java",
  54: "C++",
  50: "C",
  51: "C#",
  60: "Go",
  73: "Rust",
};

function langLabel(id) {
  return LANGUAGE_NAME[id] ? `${LANGUAGE_NAME[id]} (ID ${id})` : `Language (ID ${id})`;
}

export default function AssessmentPage() {
  const { applicationId } = useParams();
  const nav = useNavigate();

  const [data, setData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [runOutputByQid, setRunOutputByQid] = useState({});
  const [stdinByQid, setStdinByQid] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [proctorMsg, setProctorMsg] = useState(null); // { type: "warn"|"error", text: string }
  const [isFlagged, setIsFlagged] = useState(false);

  const tickRef = useRef(null);
  const saveRef = useRef(null);

  const expiresAtMs = useMemo(() => parseUtcDate(data?.attempt?.expiresAtUtc), [data?.attempt?.expiresAtUtc]);

  const [now, setNow] = useState(Date.now());
  const remainingMs = expiresAtMs !== null ? expiresAtMs - now : null;

  const patchAnswersWithStarter = useCallback((loaded) => {
    const saved = loaded?.attempt?.savedAnswers || {};
    const qs = loaded?.assessment?.questions || [];
    const patched = { ...saved };

    for (const q of qs) {
      // Treat both "code" and "challenge" as coding questions
      const isCode = q?.type === "code" || q?.type === "challenge";

      if (isCode) {
        const cur = patched[q.id];
        const defaultLang = q.languageIdsAllowed?.[0] ?? 71;

        patched[q.id] = {
          languageId: cur?.languageId ?? defaultLang,
          code: typeof cur?.code === "string" && cur.code.length > 0 ? cur.code : q.starterCode ?? "",
        };
      }
    }

    setAnswers(patched);
  }, []);

  // Use Swagger naming: /api/Applications/...
  const fetchApp = useCallback(async () => {
    const res = await api.get(`/api/Applications/${applicationId}?t=${Date.now()}`);
    return res.data;
  }, [applicationId]);

  const startAttempt = useCallback(
    async (webcamConsent = false) => {
      const res = await api.post(`/api/Applications/${applicationId}/assessment/start`, { webcamConsent });
      return res.data;
    },
    [applicationId]
  );

  const loadAndEnsureAttempt = useCallback(async () => {
    setStarting(true);
    try {
      let loaded = await fetchApp();

      // If already submitted, just show it
      if (loaded?.status === "Submitted" || loaded?.attempt?.submittedAtUtc) {
        setData(loaded);
        patchAnswersWithStarter(loaded);
        return;
      }

      const hasAssessment = !!loaded?.hasAssessment;
      const attemptExists = !!loaded?.attempt?.attemptId;

      const exp = parseUtcDate(loaded?.attempt?.expiresAtUtc);
      const expired = exp !== null && exp <= Date.now();

      if (hasAssessment && (!attemptExists || expired)) {
        const startRes = await startAttempt(false);

        if (startRes?.alreadySubmitted) {
          loaded = await fetchApp();
          setData(loaded);
          patchAnswersWithStarter(loaded);
          return;
        }

        loaded = await fetchApp();
      }

      setData(loaded);
      patchAnswersWithStarter(loaded);
    } catch (e) {
      console.error("Failed to load assessment:", e);
    } finally {
      setStarting(false);
    }
  }, [fetchApp, patchAnswersWithStarter, startAttempt]);

  useEffect(() => {
    loadAndEnsureAttempt();
  }, [loadAndEnsureAttempt]);

  useEffect(() => {
    tickRef.current = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(tickRef.current);
  }, []);

  // Auto-save every 5 seconds
  useEffect(() => {
    if (!data?.attempt?.attemptId) return;
    if (data?.status === "Submitted" || data?.attempt?.submittedAtUtc) return;

    saveRef.current = setInterval(async () => {
      try {
        setSaving(true);
        await api.put(`/api/Applications/${applicationId}/assessment`, { answers });
      } catch (e) {
        // ignore (offline etc.)
      } finally {
        setSaving(false);
      }
    }, 5000);

    return () => clearInterval(saveRef.current);
  }, [applicationId, answers, data?.attempt?.attemptId, data?.attempt?.submittedAtUtc, data?.status]);

  const sendProctor = useCallback(
    async (type) => {
      try {
        const res = await api.post(`/api/Applications/${applicationId}/assessment/proctor-event`, {
          type,
          details: { at: new Date().toISOString() },
        });

        const msg = res?.data?.message;
        if (msg) setProctorMsg({ type: "warn", text: msg });
        if (res?.data?.flagged) setIsFlagged(true);
      } catch (err) {
        const status = err?.response?.status;
        const resp = err?.response?.data;

        const msg = resp?.message;
        if (msg) setProctorMsg({ type: status === 429 ? "error" : "warn", text: msg });

        if (status === 429 || resp?.flagged) setIsFlagged(true);
      }
    },
    [applicationId]
  );

  useEffect(() => {
    if (!proctorMsg) return;
    const t = setTimeout(() => setProctorMsg(null), 4000);
    return () => clearTimeout(t);
  }, [proctorMsg]);

  useEffect(() => {
    const onVis = () => {
      if (document.hidden) sendProctor("VISIBILITY_HIDDEN");
    };
    const onBlur = () => sendProctor("WINDOW_BLUR");
    const onCopy = (e) => {
      e.preventDefault();
      sendProctor("COPY");
    };
    const onPaste = (e) => {
      e.preventDefault();
      sendProctor("PASTE");
    };

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
    };
  }, [sendProctor]);

  const setMcq = (qid, idx) => setAnswers((a) => ({ ...a, [qid]: idx }));

  const setCode = (qid, patch) => {
    setAnswers((a) => {
      const prev = a[qid] || {};
      return {
        ...a,
        [qid]: {
          languageId: prev.languageId ?? 71,
          code: typeof prev.code === "string" ? prev.code : "",
          ...patch,
        },
      };
    });
  };

  const setStdin = (qid, val) => setStdinByQid((s) => ({ ...s, [qid]: val }));

  const run = async (qid) => {
    const a = answers[qid] || {};
    const code = a.code ?? "";
    const stdinOverride = (stdinByQid[qid] ?? "").trim();

    setRunOutputByQid((o) => ({ ...o, [qid]: null }));

    const res = await api.post(`/api/Applications/${applicationId}/assessment/run`, {
      questionId: qid,
      languageId: a.languageId ?? 71,
      sourceCode: code,
      stdinOverride: stdinOverride.length > 0 ? stdinOverride : null,
    });

    setRunOutputByQid((o) => ({ ...o, [qid]: res.data }));
  };

  const submit = async () => {
    if (submitting) return;
    try {
      setSubmitting(true);
      await api.put(`/api/Applications/${applicationId}/assessment`, { answers });
      const res = await api.post(`/api/Applications/${applicationId}/assessment/submit`);

      // IMPORTANT: frontend route is plural + lowercase
      nav(`/applications/${applicationId}/result`, { state: res.data });
    } catch (e) {
      console.error("Submit failed:", e);
      alert(e?.response?.data?.message || e?.message || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  // Auto-submit on time end
  useEffect(() => {
    if (!data?.attempt?.attemptId) return;
    if (data?.status === "Submitted" || data?.attempt?.submittedAtUtc) return;

    if (remainingMs !== null && remainingMs <= 0) submit();
  }, [remainingMs, data?.attempt?.attemptId, data?.attempt?.submittedAtUtc, data?.status, submit]);

  if (!data) return <div style={{ padding: 20 }}>Loading…</div>;

  if (!data.attempt?.attemptId && data.hasAssessment) {
    return (
      <div style={{ maxWidth: 800, margin: "0 auto", padding: 20 }}>
        <h1>Assessment</h1>
        <p>This assessment hasn’t started yet.</p>
        <button
          disabled={starting}
          onClick={async () => {
            setStarting(true);
            try {
              await startAttempt(false);
              await loadAndEnsureAttempt();
            } finally {
              setStarting(false);
            }
          }}
          style={{ padding: "12px 18px", fontWeight: 700 }}
        >
          {starting ? "Starting…" : "Start Assessment"}
        </button>
      </div>
    );
  }

  if (data.status === "Submitted" || data.attempt?.submittedAtUtc) {
    return (
      <div style={{ maxWidth: 800, margin: "0 auto", padding: 20 }}>
        <h1>Assessment</h1>
        <p>This assessment was already submitted.</p>
        <button onClick={() => nav(`/applications/${applicationId}/result`)} style={{ padding: "12px 18px", fontWeight: 700 }}>
          View Result
        </button>
      </div>
    );
  }

  const assessment = data.assessment;
  if (!assessment) return <div style={{ padding: 20 }}>No assessment found.</div>;

  const questions = assessment.questions || [];

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Assessment</h1>
        <div style={{ fontFamily: "monospace" }}>
          Time left: {remainingMs === null ? "—" : msToClock(remainingMs)} {saving ? " • saving…" : ""}
        </div>
      </div>

      {proctorMsg && (
        <div
          style={{
            padding: 12,
            borderRadius: 10,
            border: `1px solid ${proctorMsg.type === "error" ? "#ef4444" : "#f59e0b"}`,
            marginBottom: 12,
            fontWeight: 600,
          }}
        >
          {proctorMsg.text}
        </div>
      )}

      {data.attempt?.flagged && (
        <div style={{ padding: 12, borderRadius: 10, border: "1px solid #ef4444", marginBottom: 12 }}>
          <b>Flagged:</b> {data.attempt.flagReason || "Suspicious behavior detected."}
        </div>
      )}

      {questions.map((q) => {
        const qRun = runOutputByQid[q.id];
        const codeAns = answers[q.id];
        const isMcq = q.type === "mcq";
        const isCode = q.type === "code" || q.type === "challenge";

        return (
          <div key={q.id} className="jobifyAssessment__qCard">
            {isMcq ? (
              <>
                <div className="jobifyAssessment__mcqPrompt">{q.prompt}</div>
                <div className="jobifyAssessment__mcq">
                  {(q.options || []).map((opt, idx) => (
                    <label key={idx} className="jobifyAssessment__mcqOpt">
                      <input type="radio" name={q.id} checked={answers[q.id] === idx} onChange={() => setMcq(q.id, idx)} />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </>
            ) : isCode ? (
              <>
                <div className="jobifyAssessment__qHeader">
                  <div>
                    <div className="jobifyAssessment__qTitle">{q.title || "Coding Question"}</div>
                    <div className="jobifyAssessment__qPrompt">{q.prompt}</div>
                  </div>

                  <select
                    className="jobifyAssessment__select"
                    value={codeAns?.languageId ?? (q.languageIdsAllowed?.[0] ?? 71)}
                    onChange={(e) => setCode(q.id, { languageId: Number(e.target.value) })}
                  >
                    {(q.languageIdsAllowed || [71]).map((lid) => (
                      <option key={lid} value={lid}>
                        {langLabel(lid)}
                      </option>
                    ))}
                  </select>
                </div>

                {Array.isArray(q.publicTests) && q.publicTests.length > 0 && (
                  <div className="jobifyAssessment__tests">
                    <b>Public Test Cases</b>
                    <div className="jobifyAssessment__testGrid">
                      {q.publicTests.map((t, i) => (
                        <div key={i} className="jobifyAssessment__testCard">
                          <div className="jobifyAssessment__testTitle">Test {i + 1}</div>

                          <div className="jobifyAssessment__kv">
                            <b>stdin</b>
                            <pre className="jobifyAssessment__pre">{t.stdin}</pre>
                          </div>

                          <div className="jobifyAssessment__kv">
                            <b>expected</b>
                            <pre className="jobifyAssessment__pre">{t.expected}</pre>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <textarea
                  value={codeAns?.code ?? q.starterCode ?? ""}
                  onChange={(e) => setCode(q.id, { code: e.target.value })}
                  rows={10}
                  className="jobifyAssessment__codeArea"
                />

                <div className="jobifyAssessment__stdinWrap">
                  <div className="jobifyAssessment__stdinTitle">Custom stdin (optional)</div>

                  <textarea
                    value={stdinByQid[q.id] ?? ""}
                    onChange={(e) => setStdin(q.id, e.target.value)}
                    rows={3}
                    placeholder="Type custom input here (if you fill this, Run uses ONLY this input)"
                    className="jobifyAssessment__codeArea"
                  />

                  <div className="jobifyAssessment__hint">Leave it empty to run all public tests.</div>
                </div>

                <div className="jobifyAssessment__btnRow">
                  <button
                    onClick={() => run(q.id)}
                    disabled={!((codeAns?.code ?? "").trim().length > 0)}
                    className="jobifyBtn jobifyBtn--primary"
                  >
                    {(stdinByQid[q.id] ?? "").trim().length > 0 ? "Run Custom Input" : "Run Public Tests"}
                  </button>

                  {(stdinByQid[q.id] ?? "").length > 0 && (
                    <button onClick={() => setStdin(q.id, "")} className="jobifyBtn jobifyBtn--danger">
                      Clear Custom stdin
                    </button>
                  )}
                </div>

                {qRun && (
                  <div className="jobifyAssessment__results">
                    <div className="jobifyAssessment__resultsHead">
                      <b>Mode:</b> {qRun.mode}
                    </div>

                    {Array.isArray(qRun.results) && qRun.results.length > 0 ? (
                      <div className="jobifyAssessment__resultsGrid">
                        {qRun.results.map((r, idx) => (
                          <div key={idx} className="jobifyAssessment__resultCard">
                            <div className="jobifyAssessment__resultTop">
                              <div className="jobifyAssessment__resultName">
                                {qRun.mode === "public" ? `Public Test ${idx + 1}` : "Custom Run"}
                              </div>
                              <div className="jobifyAssessment__status">
                                <b>Status:</b> {r.status}
                              </div>
                            </div>

                            <div className="jobifyAssessment__kv">
                              <b>stdin</b>
                              <pre className="jobifyAssessment__pre">{r.stdin}</pre>
                            </div>

                            {r.expected != null && (
                              <div className="jobifyAssessment__kv">
                                <b>expected</b>
                                <pre className="jobifyAssessment__pre">{r.expected}</pre>
                              </div>
                            )}

                            {r.compile_output && (
                              <div className="jobifyAssessment__kv">
                                <b>compile_output</b>
                                <pre className="jobifyAssessment__pre">{r.compile_output}</pre>
                              </div>
                            )}

                            {r.stderr && (
                              <div className="jobifyAssessment__kv">
                                <b>stderr</b>
                                <pre className="jobifyAssessment__pre">{r.stderr}</pre>
                              </div>
                            )}

                            {r.stdout && (
                              <div className="jobifyAssessment__kv">
                                <b>stdout</b>
                                <pre className="jobifyAssessment__pre">{r.stdout}</pre>
                              </div>
                            )}

                            {r.message && (
                              <div className="jobifyAssessment__kv">
                                <b>message</b>
                                <pre className="jobifyAssessment__pre">{r.message}</pre>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div>No results.</div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div style={{ padding: 12 }}>Unsupported question type: {String(q.type)}</div>
            )}
          </div>
        );
      })}

      <button onClick={submit} disabled={submitting} className="jobifySubmitBtn">
        {submitting ? "Submitting…" : "Submit Assessment"}
      </button>
    </div>
  );
}