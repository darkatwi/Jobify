import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, Clock } from "lucide-react";

export default function EmailConfirmed() {
    const [params] = useSearchParams();
    const navigate = useNavigate();

    const status = params.get("status");

    const isWaiting = status === "waiting_admin";

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#f6f7fb",
                fontFamily: "Inter, system-ui",
            }}
        >
            <div
                style={{
                    background: "#fff",
                    padding: "32px",
                    borderRadius: "16px",
                    width: "420px",
                    boxShadow: "0 20px 40px rgba(0,0,0,0.08)",
                    textAlign: "center",
                }}
            >
                {isWaiting ? (
                    <Clock size={48} color="#2563eb" />
                ) : (
                    <CheckCircle size={48} color="#16a34a" />
                )}

                <h2 style={{ marginTop: 16 }}>
                    {isWaiting ? "Email Confirmed" : "Success"}
                </h2>

                <p style={{ marginTop: 10, color: "#555" }}>
                    {isWaiting
                        ? "Your email has been confirmed. Your organization is now waiting for admin approval."
                        : "Your email has been confirmed successfully."}
                </p>

                <button
                    onClick={() => navigate("/login")}
                    style={{
                        marginTop: 24,
                        width: "100%",
                        padding: "12px",
                        borderRadius: "10px",
                        border: "none",
                        background: "#2563eb",
                        color: "#fff",
                        fontWeight: 600,
                        cursor: "pointer",
                    }}
                >
                    Go to Login
                </button>
            </div>
        </div>
    );
}
