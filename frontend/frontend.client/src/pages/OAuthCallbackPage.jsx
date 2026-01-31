import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function OAuthCallbackPage() {
    const navigate = useNavigate();

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get("token");
        const expiresAt = params.get("expiresAt");

        if (!token) {
            navigate("/login", { replace: true });
            return;
        }

        localStorage.setItem("jobify_token", token);

        // Optional: keep session info like you do in normal login
        localStorage.setItem(
            "jobify_user",
            JSON.stringify({
                email: "oauth",
                roles: ["Student"],
                expiresAt: expiresAt || null,
                oauth: true
            })
        );

        navigate("/dashboard", { replace: true });
    }, [navigate]);

    return (
        <div style={{ padding: 24 }}>
            Signing you in...
        </div>
    );
}
