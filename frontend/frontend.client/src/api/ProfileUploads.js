
const API_BASE = import.meta.env.VITE_API_URL;

function authHeaders() {
  const token = localStorage.getItem("jobify_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function uploadResume(file) {
    const form = new FormData();
    form.append("file", file);

    const res = await fetch(`${API_BASE}/api/profile/student/resume`, {
        method: "POST",
        headers: { ...authHeaders() }, 
        body: form,
    });

    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

export async function deleteResume() {
    const res = await fetch(`${API_BASE}/api/profile/student/resume`, {
        method: "DELETE",
        headers: { ...authHeaders() },
    });

    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

export function downloadResume() {

}
export async function uploadUniversityProof(file) {
    const form = new FormData();
    form.append("file", file);

    const res = await fetch(`${API_BASE}/api/profile/student/university-proof`, {
        method: "POST",
        headers: { ...authHeaders() },
        body: form,
    });

    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

export async function deleteUniversityProof() {
    const res = await fetch(`${API_BASE}/api/profile/student/university-proof`, {
        method: "DELETE",
        headers: { ...authHeaders() },
    });

    if (!res.ok) throw new Error(await res.text());
    return res.json();
}

async function downloadWithAuth(url, fallbackName) {
    const res = await fetch(url, { headers: { ...authHeaders() } });
    if (!res.ok) throw new Error(await res.text());

    const blob = await res.blob();

    const cd = res.headers.get("content-disposition") || "";
    const match = cd.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
    const fileName = decodeURIComponent(match?.[1] || fallbackName);

    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(blobUrl);
}

export async function downloadResumeFile() {
    return downloadWithAuth(`${API_BASE}/api/profile/student/resume`, "resume");
}

export async function downloadUniversityProofFile() {
    return downloadWithAuth(
        `${API_BASE}/api/profile/student/university-proof`,
        "university_proof"
    );
}
