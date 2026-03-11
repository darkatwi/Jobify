const API_BASE =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE ||
    "http://localhost:5159";

function getToken() {
    const token =
        localStorage.getItem("jobify_token") ||
        localStorage.getItem("token") ||
        localStorage.getItem("jwt") ||
        localStorage.getItem("authToken");
    return token && token.trim().length > 0 ? token : null;
}

async function request(path, options = {}) {
    const token = getToken();
    if (!token) throw new Error("No token found. Please login again.");

    const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {}),
            Authorization: `Bearer ${token}`,
        },
    });

    if (res.status === 401) throw new Error("Unauthorized. Please login again.");
    if (res.status === 409) throw new Error("Already exists.");
    if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed (${res.status})`);
    }

    return res.json();
}

// ─── Skills ───────────────────────────────────────────────
export const getSkills = () => request("/api/profile/student/skills");
export const addSkill = (name) => request("/api/profile/student/skills", { method: "POST", body: JSON.stringify({ name }) });
export const deleteSkill = (id) => request(`/api/profile/student/skills/${id}`, { method: "DELETE" });

// ─── Education ────────────────────────────────────────────
export const getEducation = () => request("/api/profile/student/education");
export const addEducation = (data) => request("/api/profile/student/education", { method: "POST", body: JSON.stringify(data) });
export const updateEducation = (id, data) => request(`/api/profile/student/education/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteEducation = (id) => request(`/api/profile/student/education/${id}`, { method: "DELETE" });

// ─── Experience ───────────────────────────────────────────
export const getExperience = () => request("/api/profile/student/experience");
export const addExperience = (data) => request("/api/profile/student/experience", { method: "POST", body: JSON.stringify(data) });
export const updateExperience = (id, data) => request(`/api/profile/student/experience/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteExperience = (id) => request(`/api/profile/student/experience/${id}`, { method: "DELETE" });

// ─── Projects ─────────────────────────────────────────────
export const getProjects = () => request("/api/profile/student/projects");
export const addProject = (data) => request("/api/profile/student/projects", { method: "POST", body: JSON.stringify(data) });
export const updateProject = (id, data) => request(`/api/profile/student/projects/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteProject = (id) => request(`/api/profile/student/projects/${id}`, { method: "DELETE" });

// ─── Interests ────────────────────────────────────────────
export const getInterests = () => request("/api/profile/student/interests");
export const addInterest = (interest) => request("/api/profile/student/interests", { method: "POST", body: JSON.stringify({ interest }) });
export const deleteInterest = (id) => request(`/api/profile/student/interests/${id}`, { method: "DELETE" });