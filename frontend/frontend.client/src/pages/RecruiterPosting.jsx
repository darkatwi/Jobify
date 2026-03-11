import { useState } from "react";
import { api } from "../../api/api";

export default function RecruiterPosting() {
  const [form, setForm] = useState({
    title: "",
    companyName: "",
    location: "",
    type: "Internship",
    level: "Entry",
    workMode: "Hybrid",
    description: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // 🔑 use the same key your login page stores
      const token = localStorage.getItem("jobify_token");

      if (!token) {
        throw new Error("You must be logged in as a recruiter.");
      }

      const res = await api.post("/opportunities", {
  title: form.title,
  companyName: form.companyName,
  location: form.location,
  type: form.type,
  level: form.level,
  workMode: form.workMode,
  description: form.description
});

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to create opportunity");
      }

      await res.json();

      setSuccess("Opportunity created successfully!");

      // reset form
      setForm({
        title: "",
        companyName: "",
        location: "",
        type: "Internship",
        level: "Entry",
        workMode: "Hybrid",
        description: ""
      });

    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: "700px", margin: "40px auto", padding: "20px" }}>
      <h1>Create Opportunity</h1>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: "15px" }}>
        <div>
          <label>Title</label>
          <input
            type="text"
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="Opportunity title"
            required
          />
        </div>

        <div>
          <label>Company Name</label>
          <input
            type="text"
            name="companyName"
            value={form.companyName}
            onChange={handleChange}
            placeholder="Company name"
            required
          />
        </div>

        <div>
          <label>Location</label>
          <input
            type="text"
            name="location"
            value={form.location}
            onChange={handleChange}
            placeholder="City or location"
          />
        </div>

        <div>
          <label>Type</label>
          <select name="type" value={form.type} onChange={handleChange}>
            <option value="Internship">Internship</option>
            <option value="FullTime">FullTime</option>
            <option value="PartTime">PartTime</option>
            <option value="Freelance">Freelance</option>
          </select>
        </div>

        <div>
          <label>Level</label>
          <select name="level" value={form.level} onChange={handleChange}>
            <option value="Entry">Entry</option>
            <option value="Junior">Junior</option>
            <option value="Mid">Mid</option>
            <option value="Senior">Senior</option>
          </select>
        </div>

        <div>
          <label>Work Mode</label>
          <select name="workMode" value={form.workMode} onChange={handleChange}>
            <option value="OnSite">OnSite</option>
            <option value="Remote">Remote</option>
            <option value="Hybrid">Hybrid</option>
          </select>
        </div>

        <div>
          <label>Description</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows="5"
            placeholder="Describe the opportunity..."
          />
        </div>

        {error && <p style={{ color: "red" }}>{error}</p>}
        {success && <p style={{ color: "green" }}>{success}</p>}

        <button type="submit" disabled={loading}>
          {loading ? "Posting..." : "Create Opportunity"}
        </button>
      </form>
    </div>
  );
}