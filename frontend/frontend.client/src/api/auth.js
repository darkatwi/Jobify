const API_URL =
  import.meta?.env?.VITE_API_URL ||
  "https://localhost:5001";

export async function login(email, password) {
    const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });

    // backend returns 401 with string, or 200 with json
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Login failed");
    }

    return res.json(); // { token, expiresAt, userId, email, roles }
}

export async function register(email, password) {
    const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Register failed");
    }

    return res.text(); // "User created successfully."
}
