const API_BASE =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE ||
    "http://localhost:5159";

function getToken() {
    const direct =
        localStorage.getItem("jobify_token")

    if (direct && direct.trim().length > 0) return direct.trim();

    try {
        const stored = JSON.parse(localStorage.getItem("jobify_user") || "{}");
        const t = stored?.token;
        return t && String(t).trim().length > 0 ? String(t).trim() : null;
    } catch {
        return null;
    }
}

export async function rawRequest(path, options = {}) {
    const token = getToken();
    if (!token) throw new Error("No token found. Please login again.");

    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${token}`,
        },
    });

    if (res.status === 401) throw new Error("Unauthorized (401). Please login again.");

    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed (${res.status})`);
    }

    return res;
}

async function request(path, options = {}) {
    const res = await rawRequest(path, options);
    return res.json();
}

export async function getProfile() {
    return request("/api/Profile", { method: "GET" });
}

export async function updateProfile(payload) {
    await request("/api/Profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    return getProfile();
}

export { API_BASE };
