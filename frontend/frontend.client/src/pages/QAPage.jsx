import { useState, useEffect, useCallback } from "react";
import {
    MessageSquare,
    Clock,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Send,
    RefreshCw,
    AlertCircle
} from "lucide-react";
import { api } from "../api/api";
import "./styles/qa.css";

async function fetchRecruiterOpportunities() {
    const res = await api.get("/opportunities/my");
    return res.data;
}

async function fetchQuestionsForOpportunity(opportunityId) {
    const res = await api.get(`/opportunities/${opportunityId}`);
    return res.data.qa ?? [];
}

async function postAnswer(questionId, answer) {
    await api.put(`/opportunities/questions/${questionId}/answer`, { answer });
}

function timeAgo(dateStr) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

function PostingSelector({ postings, selectedId, onSelect }) {
    if (postings.length === 0) {
        return (
            <div className="qa-sidebar">
                <p className="qa-sidebar__empty">No postings found.</p>
            </div>
        );
    }

    return (
        <div className="qa-sidebar">
            <p className="qa-sidebar__label">Your Postings</p>
            <div className="qa-sidebar__list">
                {postings.map((p) => {
                    const isSelected = String(p.id) === String(selectedId);
                    return (
                        <button
                            key={p.id}
                            onClick={() => onSelect(String(p.id))}
                            className={`qa-sidebar__item${isSelected ? " qa-sidebar__item--active" : ""}`}
                        >
                            <div className="qa-sidebar__item-title">{p.title}</div>
                            <div className="qa-sidebar__item-company">{p.companyName}</div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function OpportunityStrip({ title, company, pendingCount, answeredCount, onRefresh, loading }) {
    return (
        <div className="qa-strip">
            <div>
                <h2 className="qa-strip__title">{title}</h2>
                <p className="qa-strip__company">{company}</p>
            </div>

            <div className="qa-strip__stats">
                <span className="qa-pill qa-pill--pending">
                    <Clock size={16} />
                    {pendingCount} pending
                </span>

                <span className="qa-pill qa-pill--answered">
                    <CheckCircle2 size={16} />
                    {answeredCount} answered
                </span>

                <button
                    onClick={onRefresh}
                    disabled={loading}
                    className={`qa-refresh-btn${loading ? " qa-refresh-btn--spinning" : ""}`}
                    type="button"
                >
                    <RefreshCw size={16} />
                </button>
            </div>
        </div>
    );
}

function FilterTabs({ activeFilter, onFilterChange, pendingCount }) {
    const tabs = [
        { value: "all", label: "All" },
        { value: "pending", label: "Pending", badge: pendingCount > 0 ? pendingCount : null },
        { value: "answered", label: "Answered" },
    ];

    return (
        <div className="qa-filters">
            {tabs.map((tab) => (
                <button
                    key={tab.value}
                    onClick={() => onFilterChange(tab.value)}
                    className={`qa-filter-btn${activeFilter === tab.value ? " qa-filter-btn--active" : ""}`}
                    type="button"
                >
                    {tab.label}
                    {tab.badge && <span className="qa-filter-badge">{tab.badge}</span>}
                </button>
            ))}
        </div>
    );
}

function QuestionCard({ question, onReply }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [replyText, setReplyText] = useState(question.answer || "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const isAnswered = !!question.answer;
    const borderClass = isAnswered ? "qa-card--answered" : "qa-card--pending";

    const handleSubmit = async () => {
        if (!replyText.trim()) return;

        setSaving(true);
        setError(null);

        try {
            await onReply(question.id, replyText.trim());
            setIsExpanded(false);
        } catch {
            setError("Failed to save reply. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setReplyText(question.answer || "");
        setIsExpanded(false);
        setError(null);
    };

    return (
        <div className={`qa-card ${borderClass}`}>
            <button
                className="qa-card__header"
                onClick={() => setIsExpanded(!isExpanded)}
                type="button"
            >
                <div className="qa-card__header-inner">
                    <div className="qa-card__header-content">
                        {isAnswered ? (
                            <span className="qa-status-badge qa-status-badge--answered">
                                <CheckCircle2 size={16} />
                                Answered
                            </span>
                        ) : (
                            <span className="qa-status-badge qa-status-badge--pending">
                                <Clock size={16} />
                                Awaiting Reply
                            </span>
                        )}

                        <p className="qa-card__question">{question.question}</p>

                        <div className="qa-card__time">
                            <Clock size={14} />
                            <span>{timeAgo(question.askedAtUtc)}</span>
                        </div>
                    </div>

                    <div className="qa-card__chevron">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                </div>
            </button>

            {isAnswered && !isExpanded && question.answer && (
                <div className="qa-card__preview">
                    <span className="qa-card__preview-label">Your reply:</span>{" "}
                    {question.answer}
                </div>
            )}

            {isExpanded && (
                <div className="qa-card__editor">
                    <label className="qa-card__editor-label">
                        {isAnswered ? "Edit Your Reply" : "Write a Reply"}
                    </label>

                    <textarea
                        className="qa-card__textarea"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Type a clear, helpful answer for candidates…"
                        rows={4}
                    />

                    {error && (
                        <div className="qa-card__error">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <div className="qa-card__actions">
                        <button
                            className="qa-btn-primary"
                            onClick={handleSubmit}
                            disabled={saving || !replyText.trim()}
                            type="button"
                        >
                            <Send size={16} />
                            {saving ? "Posting…" : "Post Reply"}
                        </button>

                        <button
                            className="qa-btn-secondary"
                            onClick={handleCancel}
                            disabled={saving}
                            type="button"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function EmptyState({ filter }) {
    const messages = {
        all: { title: "No questions yet", sub: "Questions from candidates will appear here." },
        pending: { title: "All caught up!", sub: "No pending questions for this posting." },
        answered: { title: "No answered questions", sub: "Questions you reply to will appear here." },
    };

    const msg = messages[filter] ?? messages.all;

    return (
        <div className="qa-empty">
            <MessageSquare size={28} />
            <p className="qa-empty__title">{msg.title}</p>
            <p className="qa-empty__sub">{msg.sub}</p>
        </div>
    );
}

export default function QAPage() {
    const [postings, setPostings] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [filter, setFilter] = useState("all");
    const [loadingPostings, setLoadingPostings] = useState(true);
    const [loadingQuestions, setLoadingQuestions] = useState(false);
    const [postingsError, setPostingsError] = useState(null);

    useEffect(() => {
        setLoadingPostings(true);
        fetchRecruiterOpportunities()
            .then((data) => {
                setPostings(data);
                if (data.length > 0) setSelectedId(String(data[0].id));
            })
            .catch(() =>
                setPostingsError(
                    "Could not load your postings. Make sure you are logged in as a Recruiter."
                )
            )
            .finally(() => setLoadingPostings(false));
    }, []);

    const loadQuestions = useCallback(() => {
        if (!selectedId) return;

        setLoadingQuestions(true);
        fetchQuestionsForOpportunity(selectedId)
            .then(setQuestions)
            .catch(() => setQuestions([]))
            .finally(() => setLoadingQuestions(false));
    }, [selectedId]);

    useEffect(() => {
        loadQuestions();
    }, [loadQuestions]);

    const handleReply = async (questionId, answer) => {
        await postAnswer(questionId, answer);

        setQuestions((prev) =>
            prev.map((q) =>
                String(q.id) === String(questionId) ? { ...q, answer } : q
            )
        );
    };

    const selectedPosting = postings.find((p) => String(p.id) === String(selectedId));

    const filteredQuestions = questions.filter((q) => {
        if (filter === "pending") return !q.answer;
        if (filter === "answered") return !!q.answer;
        return true;
    });

    const pendingCount = questions.filter((q) => !q.answer).length;
    const answeredCount = questions.filter((q) => !!q.answer).length;

    return (
        <div className="qa-page">
            <div className="qa-shell">
                <div className="qa-page-header">
                    <div className="qa-page-header__title-row">
                        <MessageSquare className="qa-page-header__icon" />
                        <h1 className="qa-page-header__title">Candidate Q&amp;A</h1>
                    </div>

                    <p className="qa-page-header__sub">
                        Answer questions from candidates. Replies appear publicly on the job listing.
                    </p>
                </div>

                {postingsError && (
                    <div className="qa-error">
                        <AlertCircle size={16} />
                        {postingsError}
                    </div>
                )}

                {loadingPostings ? (
                    <div className="qa-skeleton">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="qa-skeleton__item" />
                        ))}
                    </div>
                ) : (
                    <div className="qa-layout">
                        <div>
                            <PostingSelector
                                postings={postings}
                                selectedId={selectedId}
                                onSelect={(id) => {
                                    setSelectedId(id);
                                    setFilter("all");
                                }}
                            />
                        </div>

                        <div className="qa-main">
                            {selectedPosting && (
                                <OpportunityStrip
                                    title={selectedPosting.title}
                                    company={selectedPosting.companyName}
                                    pendingCount={pendingCount}
                                    answeredCount={answeredCount}
                                    onRefresh={loadQuestions}
                                    loading={loadingQuestions}
                                />
                            )}

                            <FilterTabs
                                activeFilter={filter}
                                onFilterChange={setFilter}
                                pendingCount={pendingCount}
                            />

                            {loadingQuestions ? (
                                <div className="qa-questions-skeleton">
                                    {[1, 2].map((i) => (
                                        <div key={i} className="qa-questions-skeleton__item" />
                                    ))}
                                </div>
                            ) : filteredQuestions.length === 0 ? (
                                <EmptyState filter={filter} />
                            ) : (
                                <div className="qa-questions-list">
                                    {filteredQuestions.map((q) => (
                                        <QuestionCard
                                            key={q.id}
                                            question={q}
                                            onReply={handleReply}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}