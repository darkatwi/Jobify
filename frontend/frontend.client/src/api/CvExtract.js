import { rawRequest } from "./profile";

export async function extractSkillsFromCv(file) {
    const form = new FormData();
    form.append("file", file); 

    const res = await rawRequest("/api/student/cv/upload", {
        method: "POST",
        body: form,
    });

    return res.json();
}
