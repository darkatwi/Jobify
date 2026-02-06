import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function OAuthCallbackPage() {
        const navigate = useNavigate();
        const API_BASE = import.meta.env.VITE_API_URL || "https://localhost:7176";

        useEffect(() => {
            console.log("OAuthCallbackPage loaded ✅");
            const params = new URLSearchParams(window.location.search);
            const code = params.get("code");
            console.log("code =", code);
            console.log("API_BASE =", API_BASE);

            if (!code) {
                navigate("/login", { replace: true });
                return;
            }

            (async () => {
                try {
                    const res = await fetch(`${API_BASE}/api/Auth/external/complete`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ code }),
                    });

                    const text = await res.text();
                    if (!res.ok) throw new Error(text);
                    const data = JSON.parse(text);

                    localStorage.setItem("jobify_token", data.token);
                    localStorage.setItem(
                        "jobify_user",
                        JSON.stringify({
                            userId: data.userId,
                            email: data.email,
                            roles: data.roles,
                            expiresAt: data.expiresAt,
                            oauth: true,
                        })
                    );

                    navigate("/dashboard", { replace: true });
                } catch (e) {
                    console.error("OAuth complete failed:", e);
                    navigate("/login", { replace: true });
                }
            })();
        }, [navigate, API_BASE]);

        return <div style={{ padding: 24 }}>Signing you in...</div>;
    }

