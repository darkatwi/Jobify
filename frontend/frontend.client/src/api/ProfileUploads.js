
import { rawRequest } from "./profile";

export async function uploadResume(file) {
    const form = new FormData();
    form.append("file", file);

    const res = await rawRequest("/api/Profile/student/resume", {
        method: "POST",
        body: form,
    });

    return res.json(); // profile updated etc
}

export async function deleteResume() {
    const res = await rawRequest("/api/Profile/student/resume", { method: "DELETE" });
    return res.json();
}

export async function uploadUniversityProof(file) {
    const form = new FormData();
    form.append("file", file);

    const res = await rawRequest("/api/Profile/student/university-proof", {
        method: "POST",
        body: form,
    });

    return res.json();
}

export async function deleteUniversityProof() {
    const res = await rawRequest("/api/Profile/student/university-proof", { method: "DELETE" });
    return res.json();
}

async function downloadWithAuth(path, fallbackName) {
    const res = await rawRequest(path, { method: "GET" });
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
    return downloadWithAuth("/api/Profile/student/resume", "resume");
}

export async function downloadUniversityProofFile() {
    return downloadWithAuth("/api/Profile/student/university-proof", "university_proof");
}
