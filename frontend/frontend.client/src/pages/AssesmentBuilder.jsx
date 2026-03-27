import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/api";
import {
    Plus,
    Trash2,
    ArrowLeft,
    Clock3,
    Save,
    Code2,
    ListChecks,
} from "lucide-react";
import "./styles/assesmentbuilder.css";

const emptyMcq = () => ({
    prompt: "",
    options: ["", "", "", ""],
    correctIndex: 0,
});

const emptyCode = () => ({
    title: "",
    prompt: "",
    language: "javascript",
    starterCode: "",
    publicTests: [{ stdin: "", expected: "" }],
    hiddenTests: [],
});

function normalizeMcq(mcq = {}) {
    return {
        prompt: mcq.prompt || "",
        options:
            Array.isArray(mcq.options) && mcq.options.length > 0
                ? mcq.options
                : ["", "", "", ""],
        correctIndex:
            typeof mcq.correctIndex === "number" ? mcq.correctIndex : 0,
    };
}

function normalizeTests(tests, fallback = []) {
    if (!Array.isArray(tests)) return fallback;

    return tests.map((t) => ({
        stdin: t?.stdin ?? t?.input ?? "",
        expected: t?.expected ?? t?.expectedOutput ?? "",
    }));
}

function normalizeCode(code = {}) {
    const publicTests = normalizeTests(code.publicTests, [
        { stdin: "", expected: "" },
    ]);
    const hiddenTests = normalizeTests(code.hiddenTests, []);

    return {
        title: code.title || "",
        prompt: code.prompt || "",
        language: code.language || "javascript",
        starterCode: code.starterCode || "",
        publicTests,
        hiddenTests,
    };
}

function mapLanguageToJudge0Id(language) {
    switch ((language || "").toLowerCase()) {
        case "javascript":
            return 63;
        case "python":
            return 71;
        case "csharp":
            return 51;
        case "java":
            return 62;
        case "cpp":
            return 54;
        default:
            return 71;
    }
}

function toLegacyAssessmentFormat(timeLimitMinutes, mcqs, codingChallenges) {
    const questions = [
        ...mcqs.map((q, index) => ({
            id: `mcq-${index}`,
            type: "mcq",
            prompt: String(q.prompt || "").trim(),
            options: Array.isArray(q.options)
                ? q.options.map((x) => String(x || "").trim())
                : [],
            correctIndex:
                typeof q.correctIndex === "number" ? q.correctIndex : 0,
        })),

        ...codingChallenges.map((q, index) => {
            const publicTests = normalizeTests(q.publicTests, []).filter(
                (t) =>
                    String(t.stdin || "").trim() !== "" ||
                    String(t.expected || "").trim() !== ""
            );

            const hiddenTestsRaw = normalizeTests(q.hiddenTests, []).filter(
                (t) =>
                    String(t.stdin || "").trim() !== "" ||
                    String(t.expected || "").trim() !== ""
            );

            const hiddenTests =
                hiddenTestsRaw.length > 0 ? hiddenTestsRaw : publicTests;

            return {
                id: `code-${index}`,
                type: "code",
                title:
                    String(q.title || "").trim() ||
                    `Coding Question ${index + 1}`,
                prompt: String(q.prompt || "").trim(),
                starterCode: q.starterCode || "",
                language: q.language || "python",
                languageId: mapLanguageToJudge0Id(q.language),
                languageIdsAllowed: [71, 63, 62, 51, 54],
                publicTests,
                hiddenTests,
            };
        }),
    ];

    return {
        timeLimitSeconds: Math.max(60, Number(timeLimitMinutes || 30) * 60),
        randomize: true,
        questions,
    };
}

function fromOpportunityAssessment(assessment, assessmentTimeLimitSeconds) {
    if (!assessment) {
        return {
            timeLimitMinutes: Math.max(
                1,
                Math.floor((assessmentTimeLimitSeconds || 1800) / 60)
            ),
            mcqs: [],
            codingChallenges: [],
        };
    }

    if (
        Array.isArray(assessment.mcqs) ||
        Array.isArray(assessment.codingChallenges)
    ) {
        return {
            timeLimitMinutes:
                assessment.timeLimitMinutes ||
                Math.max(
                    1,
                    Math.floor((assessmentTimeLimitSeconds || 1800) / 60)
                ),
            mcqs: Array.isArray(assessment.mcqs)
                ? assessment.mcqs.map(normalizeMcq)
                : [],
            codingChallenges: Array.isArray(assessment.codingChallenges)
                ? assessment.codingChallenges.map(normalizeCode)
                : [],
        };
    }

    if (Array.isArray(assessment.questions)) {
        const questions = assessment.questions;

        const mcqs = questions
            .filter((q) => String(q.type || "").toLowerCase() === "mcq")
            .map((q) =>
                normalizeMcq({
                    prompt: q.prompt || "",
                    options: Array.isArray(q.options)
                        ? q.options
                        : ["", "", "", ""],
                    correctIndex:
                        typeof q.correctIndex === "number"
                            ? q.correctIndex
                            : 0,
                })
            );

        const codingChallenges = questions
            .filter((q) => {
                const type = String(q.type || "").toLowerCase();
                return type === "code" || type === "coding";
            })
            .map((q) =>
                normalizeCode({
                    title: q.title || "",
                    prompt: q.prompt || "",
                    language: q.language || "javascript",
                    starterCode: q.starterCode || "",
                    publicTests: Array.isArray(q.publicTests)
                        ? q.publicTests
                        : [],
                    hiddenTests: Array.isArray(q.hiddenTests)
                        ? q.hiddenTests
                        : [],
                })
            );

        return {
            timeLimitMinutes: assessment.timeLimitSeconds
                ? Math.max(1, Math.floor(assessment.timeLimitSeconds / 60))
                : Math.max(
                    1,
                    Math.floor((assessmentTimeLimitSeconds || 1800) / 60)
                ),
            mcqs,
            codingChallenges,
        };
    }

    return {
        timeLimitMinutes: Math.max(
            1,
            Math.floor((assessmentTimeLimitSeconds || 1800) / 60)
        ),
        mcqs: [],
        codingChallenges: [],
    };
}

export default function AssessmentBuilderPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [jobTitle, setJobTitle] = useState("");

    const [timeLimitMinutes, setTimeLimitMinutes] = useState(30);
    const [mcqs, setMcqs] = useState([]);
    const [codingChallenges, setCodingChallenges] = useState([]);

    useEffect(() => {
        async function loadOpportunity() {
            try {
                setLoading(true);

                const res = await api.get(`/opportunities/${id}`);
                const opp = res.data;

                setJobTitle(opp.title || "");

                const parsed = fromOpportunityAssessment(
                    opp.assessment,
                    opp.assessmentTimeLimitSeconds
                );

                setTimeLimitMinutes(parsed.timeLimitMinutes);
                setMcqs(parsed.mcqs);
                setCodingChallenges(parsed.codingChallenges);
            } catch (err) {
                console.error(err);
                alert("Failed to load opportunity.");
                navigate("/organization");
            } finally {
                setLoading(false);
            }
        }

        loadOpportunity();
    }, [id, navigate]);

    const totalQuestions = useMemo(
        () => mcqs.length + codingChallenges.length,
        [mcqs, codingChallenges]
    );

    function addMcq() {
        setMcqs((prev) => [...prev, emptyMcq()]);
    }

    function removeMcq(index) {
        setMcqs((prev) => prev.filter((_, i) => i !== index));
    }

    function updateMcq(index, patch) {
        setMcqs((prev) =>
            prev.map((q, i) => (i === index ? { ...q, ...patch } : q))
        );
    }

    function updateMcqOption(qIndex, optIndex, value) {
        setMcqs((prev) =>
            prev.map((q, i) =>
                i === qIndex
                    ? {
                        ...q,
                        options: q.options.map((opt, j) =>
                            j === optIndex ? value : opt
                        ),
                    }
                    : q
            )
        );
    }

    function addCode() {
        setCodingChallenges((prev) => [...prev, emptyCode()]);
    }

    function removeCode(index) {
        setCodingChallenges((prev) => prev.filter((_, i) => i !== index));
    }

    function updateCode(index, patch) {
        setCodingChallenges((prev) =>
            prev.map((q, i) => (i === index ? { ...q, ...patch } : q))
        );
    }

    function updateCodePublicTest(index, testIndex, field, value) {
        const q = codingChallenges[index];
        const updated = [...q.publicTests];
        updated[testIndex] = {
            ...updated[testIndex],
            [field]: value,
        };
        updateCode(index, { publicTests: updated });
    }

    function addCodePublicTest(index) {
        const q = codingChallenges[index];
        updateCode(index, {
            publicTests: [...q.publicTests, { stdin: "", expected: "" }],
        });
    }

    function removeCodePublicTest(index, testIndex) {
        const q = codingChallenges[index];
        const updated = q.publicTests.filter((_, i) => i !== testIndex);
        updateCode(index, {
            publicTests:
                updated.length > 0 ? updated : [{ stdin: "", expected: "" }],
        });
    }

    function updateCodeHiddenTest(index, testIndex, field, value) {
        const q = codingChallenges[index];
        const updated = [...q.hiddenTests];
        updated[testIndex] = {
            ...updated[testIndex],
            [field]: value,
        };
        updateCode(index, { hiddenTests: updated });
    }

    function addCodeHiddenTest(index) {
        const q = codingChallenges[index];
        updateCode(index, {
            hiddenTests: [...q.hiddenTests, { stdin: "", expected: "" }],
        });
    }

    function removeCodeHiddenTest(index, testIndex) {
        const q = codingChallenges[index];
        updateCode(index, {
            hiddenTests: q.hiddenTests.filter((_, i) => i !== testIndex),
        });
    }

    function validateAssessment() {
        for (let i = 0; i < mcqs.length; i++) {
            const q = mcqs[i];

            if (!String(q.prompt || "").trim()) {
                return `MCQ ${i + 1}: question is required.`;
            }

            if (!Array.isArray(q.options) || q.options.length < 2) {
                return `MCQ ${i + 1}: add at least 2 options.`;
            }

            if (q.options.some((x) => !String(x || "").trim())) {
                return `MCQ ${i + 1}: all options must be filled.`;
            }

            if (
                typeof q.correctIndex !== "number" ||
                q.correctIndex < 0 ||
                q.correctIndex >= q.options.length
            ) {
                return `MCQ ${i + 1}: choose a valid correct answer.`;
            }
        }

        for (let i = 0; i < codingChallenges.length; i++) {
            const q = codingChallenges[i];

            if (!String(q.title || "").trim()) {
                return `Coding question ${i + 1}: title is required.`;
            }

            if (!String(q.prompt || "").trim()) {
                return `Coding question ${i + 1}: prompt is required.`;
            }

            const hasValidPublicTest = Array.isArray(q.publicTests)
                ? q.publicTests.some(
                    (t) =>
                        String(t.stdin || "").trim() !== "" ||
                        String(t.expected || "").trim() !== ""
                )
                : false;

            if (!hasValidPublicTest) {
                return `Coding question ${i + 1}: add at least one public test.`;
            }

            for (let j = 0; j < q.publicTests.length; j++) {
                const t = q.publicTests[j];
                if (!String(t.expected || "").trim()) {
                    return `Coding question ${i + 1}, public test ${j + 1}: expected output is required.`;
                }
            }

            for (let j = 0; j < q.hiddenTests.length; j++) {
                const t = q.hiddenTests[j];
                if (!String(t.expected || "").trim()) {
                    return `Coding question ${i + 1}, hidden test ${j + 1}: expected output is required.`;
                }
            }
        }

        if (Number(timeLimitMinutes) <= 0) {
            return "Time limit must be greater than 0.";
        }

        if (mcqs.length === 0 && codingChallenges.length === 0) {
            return "Add at least one question.";
        }

        return null;
    }

    async function saveAssessment() {
        const err = validateAssessment();
        if (err) {
            alert(err);
            return;
        }

        setSaving(true);

        try {
            const oppRes = await api.get(`/opportunities/${id}`);
            const opp = oppRes.data;

            const payload = {
                title: opp.title,
                companyName: opp.companyName,
                location: opp.location,
                locationName: opp.locationName,
                fullAddress: opp.fullAddress,
                type: opp.type,
                level: opp.level,
                workMode: opp.workMode,
                minPay: opp.minPay,
                maxPay: opp.maxPay,
                description: opp.description,
                deadlineUtc: opp.deadlineUtc,
                responsibilities: opp.responsibilities || [],
                benefits: opp.benefits || [],
                preferredSkills: opp.preferredSkills || [],
                skills: opp.skills || [],
                latitude: opp.latitude,
                longitude: opp.longitude,
                assessment: toLegacyAssessmentFormat(
                    timeLimitMinutes,
                    mcqs,
                    codingChallenges
                ),
            };

            await api.put(`/opportunities/${id}`, payload);
            alert("Assessment saved successfully.");
            navigate("/organization");
        } catch (err) {
            console.error(err);
            alert("Failed to save assessment.");
        } finally {
            setSaving(false);
        }
    }

    async function removeAssessment() {
        if (!window.confirm("Remove this assessment from the opportunity?")) {
            return;
        }

        setSaving(true);

        try {
            const oppRes = await api.get(`/opportunities/${id}`);
            const opp = oppRes.data;

            const payload = {
                title: opp.title,
                companyName: opp.companyName,
                location: opp.location,
                locationName: opp.locationName,
                fullAddress: opp.fullAddress,
                type: opp.type,
                level: opp.level,
                workMode: opp.workMode,
                minPay: opp.minPay,
                maxPay: opp.maxPay,
                description: opp.description,
                deadlineUtc: opp.deadlineUtc,
                responsibilities: opp.responsibilities || [],
                benefits: opp.benefits || [],
                preferredSkills: opp.preferredSkills || [],
                skills: opp.skills || [],
                latitude: opp.latitude,
                longitude: opp.longitude,
                assessment: null,
            };

            await api.put(`/opportunities/${id}`, payload);
            alert("Assessment removed.");
            navigate("/organization");
        } catch (err) {
            console.error(err);
            alert("Failed to remove assessment.");
        } finally {
            setSaving(false);
        }
    }

    if (loading) {
        return (
            <div className="assessment-page">
                <div className="assessment-card">Loading assessment.</div>
            </div>
        );
    }

    return (
        <div className="assessment-page">
            <div className="assessment-card">
                <div className="assessment-topbar">
                    <button
                        className="assessment-back"
                        onClick={() => navigate("/organization")}
                    >
                        <ArrowLeft size={16} />
                        Back
                    </button>

                    <div>
                        <h1 className="assessment-title">Assessment Builder</h1>
                        <p className="assessment-subtitle">
                            {jobTitle || "Opportunity Assessment"}
                        </p>
                    </div>
                </div>

                <div className="assessment-summary">
                    <div className="assessment-stat">
                        <Clock3 size={16} />
                        <span>Time Limit</span>
                        <strong>{timeLimitMinutes} min</strong>
                    </div>

                    <div className="assessment-stat">
                        <ListChecks size={16} />
                        <span>MCQs</span>
                        <strong>{mcqs.length}</strong>
                    </div>

                    <div className="assessment-stat">
                        <Code2 size={16} />
                        <span>Coding</span>
                        <strong>{codingChallenges.length}</strong>
                    </div>

                    <div className="assessment-stat">
                        <span>Total</span>
                        <strong>{totalQuestions}</strong>
                    </div>
                </div>

                <div className="assessment-field">
                    <label>Time Limit (minutes)</label>
                    <input
                        type="number"
                        min="1"
                        className="assessment-input"
                        value={timeLimitMinutes}
                        onChange={(e) =>
                            setTimeLimitMinutes(Number(e.target.value))
                        }
                    />
                </div>

                <div className="assessment-section">
                    <div className="assessment-section-header">
                        <h2>MCQ Questions</h2>
                        <button
                            type="button"
                            className="assessment-btn assessment-btn-outline"
                            onClick={addMcq}
                        >
                            <Plus size={15} />
                            Add MCQ
                        </button>
                    </div>

                    {mcqs.length === 0 && (
                        <div className="assessment-empty">
                            No MCQs added yet.
                        </div>
                    )}

                    {mcqs.map((q, index) => (
                        <div key={index} className="assessment-question-card">
                            <div className="assessment-question-head">
                                <h3>MCQ {index + 1}</h3>
                                <button
                                    type="button"
                                    className="assessment-icon-btn"
                                    onClick={() => removeMcq(index)}
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>

                            <div className="assessment-field">
                                <label>Question</label>
                                <textarea
                                    className="assessment-textarea"
                                    value={q.prompt}
                                    onChange={(e) =>
                                        updateMcq(index, {
                                            prompt: e.target.value,
                                        })
                                    }
                                />
                            </div>

                            <div className="assessment-field">
                                <label>Options</label>
                                <div className="assessment-options">
                                    {q.options.map((opt, optIndex) => (
                                        <input
                                            key={optIndex}
                                            className="assessment-input"
                                            value={opt}
                                            placeholder={`Option ${optIndex + 1}`}
                                            onChange={(e) =>
                                                updateMcqOption(
                                                    index,
                                                    optIndex,
                                                    e.target.value
                                                )
                                            }
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="assessment-field">
                                <label>Correct Answer</label>
                                <select
                                    className="assessment-input"
                                    value={q.correctIndex}
                                    onChange={(e) =>
                                        updateMcq(index, {
                                            correctIndex: Number(
                                                e.target.value
                                            ),
                                        })
                                    }
                                >
                                    {q.options.map((_, optIndex) => (
                                        <option
                                            key={optIndex}
                                            value={optIndex}
                                        >
                                            Option {optIndex + 1}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="assessment-section">
                    <div className="assessment-section-header">
                        <h2>Coding Questions</h2>
                        <button
                            type="button"
                            className="assessment-btn assessment-btn-outline"
                            onClick={addCode}
                        >
                            <Plus size={15} />
                            Add Coding
                        </button>
                    </div>

                    {codingChallenges.length === 0 && (
                        <div className="assessment-empty">
                            No coding questions added yet.
                        </div>
                    )}

                    {codingChallenges.map((q, index) => (
                        <div key={index} className="assessment-question-card">
                            <div className="assessment-question-head">
                                <h3>Coding {index + 1}</h3>
                                <button
                                    type="button"
                                    className="assessment-icon-btn"
                                    onClick={() => removeCode(index)}
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>

                            <div className="assessment-field">
                                <label>Title</label>
                                <input
                                    className="assessment-input"
                                    value={q.title}
                                    onChange={(e) =>
                                        updateCode(index, {
                                            title: e.target.value,
                                        })
                                    }
                                />
                            </div>

                            <div className="assessment-field">
                                <label>Prompt</label>
                                <textarea
                                    className="assessment-textarea"
                                    value={q.prompt}
                                    onChange={(e) =>
                                        updateCode(index, {
                                            prompt: e.target.value,
                                        })
                                    }
                                />
                            </div>

                            <div className="assessment-field">
                                <label>Language</label>
                                <select
                                    className="assessment-input"
                                    value={q.language}
                                    onChange={(e) =>
                                        updateCode(index, {
                                            language: e.target.value,
                                        })
                                    }
                                >
                                    <option value="javascript">
                                        JavaScript
                                    </option>
                                    <option value="python">Python</option>
                                    <option value="csharp">C#</option>
                                    <option value="java">Java</option>
                                    <option value="cpp">C++</option>
                                </select>
                            </div>

                            <div className="assessment-field">
                                <label>Starter Code</label>
                                <textarea
                                    className="assessment-code"
                                    value={q.starterCode}
                                    onChange={(e) =>
                                        updateCode(index, {
                                            starterCode: e.target.value,
                                        })
                                    }
                                />
                            </div>

                            <div className="assessment-field">
                                <label>Public Tests</label>

                                {q.publicTests.map((t, testIndex) => (
                                    <div
                                        key={testIndex}
                                        style={{
                                            display: "grid",
                                            gridTemplateColumns:
                                                "1fr 1fr auto",
                                            gap: "10px",
                                            marginBottom: "10px",
                                        }}
                                    >
                                        <input
                                            className="assessment-input"
                                            placeholder="stdin"
                                            value={t.stdin}
                                            onChange={(e) =>
                                                updateCodePublicTest(
                                                    index,
                                                    testIndex,
                                                    "stdin",
                                                    e.target.value
                                                )
                                            }
                                        />

                                        <input
                                            className="assessment-input"
                                            placeholder="expected output"
                                            value={t.expected}
                                            onChange={(e) =>
                                                updateCodePublicTest(
                                                    index,
                                                    testIndex,
                                                    "expected",
                                                    e.target.value
                                                )
                                            }
                                        />

                                        <button
                                            type="button"
                                            className="assessment-icon-btn"
                                            onClick={() =>
                                                removeCodePublicTest(
                                                    index,
                                                    testIndex
                                                )
                                            }
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                ))}

                                <button
                                    type="button"
                                    className="assessment-btn assessment-btn-outline"
                                    onClick={() => addCodePublicTest(index)}
                                >
                                    <Plus size={15} />
                                    Add Public Test
                                </button>
                            </div>

                            <div className="assessment-field">
                                <label>Hidden Tests (optional)</label>

                                {q.hiddenTests.map((t, testIndex) => (
                                    <div
                                        key={testIndex}
                                        style={{
                                            display: "grid",
                                            gridTemplateColumns:
                                                "1fr 1fr auto",
                                            gap: "10px",
                                            marginBottom: "10px",
                                        }}
                                    >
                                        <input
                                            className="assessment-input"
                                            placeholder="stdin"
                                            value={t.stdin}
                                            onChange={(e) =>
                                                updateCodeHiddenTest(
                                                    index,
                                                    testIndex,
                                                    "stdin",
                                                    e.target.value
                                                )
                                            }
                                        />

                                        <input
                                            className="assessment-input"
                                            placeholder="expected output"
                                            value={t.expected}
                                            onChange={(e) =>
                                                updateCodeHiddenTest(
                                                    index,
                                                    testIndex,
                                                    "expected",
                                                    e.target.value
                                                )
                                            }
                                        />

                                        <button
                                            type="button"
                                            className="assessment-icon-btn"
                                            onClick={() =>
                                                removeCodeHiddenTest(
                                                    index,
                                                    testIndex
                                                )
                                            }
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                ))}

                                <button
                                    type="button"
                                    className="assessment-btn assessment-btn-outline"
                                    onClick={() => addCodeHiddenTest(index)}
                                >
                                    <Plus size={15} />
                                    Add Hidden Test
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="assessment-actions">
                    <button
                        type="button"
                        className="assessment-btn assessment-btn-danger"
                        onClick={removeAssessment}
                        disabled={saving}
                    >
                        Remove Assessment
                    </button>

                    <button
                        type="button"
                        className="assessment-btn assessment-btn-primary"
                        onClick={saveAssessment}
                        disabled={saving}
                    >
                        <Save size={16} />
                        {saving ? "Saving..." : "Save Assessment"}
                    </button>
                </div>
            </div>
        </div>
    );
}
