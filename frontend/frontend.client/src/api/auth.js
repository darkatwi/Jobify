const API_URL =
  import.meta?.env?.VITE_API_URL ||
  "http://localhost:5159";

export async function login(email, password) {
    const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Login failed");
    }

    return res.json();
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

    return res.text();
}

export async function changePassword(currentPassword, newPassword, confirmNewPassword) {
    const token = localStorage.getItem("jobify_token");

    const res = await fetch(`${API_URL}/api/auth/change-password`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            currentPassword,
            newPassword,
            confirmNewPassword,
        }),
    });

    if (!res.ok) {
        let errorMessage = "Failed to change password";

        try {
            const data = await res.json();

            if (data?.message) {
                errorMessage = data.message;
            } else if (Array.isArray(data) && data.length > 0) {
                errorMessage = data[0];
            } else if (data?.errors && Array.isArray(data.errors) && data.errors.length > 0) {
                errorMessage = data.errors.join(", ");
            }
        } catch {
            const text = await res.text();
            errorMessage = text || errorMessage;
        }

        throw new Error(errorMessage);
    }

    return res.json();
}