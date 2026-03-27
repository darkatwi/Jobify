import { useState } from "react";
import { changePassword } from "../api/auth";
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import "./styles/resetpassword.css";

export default function ChangePasswordPage() {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  const [show, setShow] = useState({
    current: false,
    next: false,
    confirm: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.currentPassword || !form.newPassword || !form.confirmNewPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (form.newPassword !== form.confirmNewPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await changePassword(
        form.currentPassword,
        form.newPassword,
        form.confirmNewPassword
      );

      setSuccess(res.message || "Password changed successfully.");

      setForm({
        currentPassword: "",
        newPassword: "",
        confirmNewPassword: "",
      });
    } catch (err) {
      setError(err.message || "Failed to change password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="reset-password-page">
      <div className="reset-password-card">
        <div className="reset-password-header">
          <div className="icon-wrap">
            <Lock size={24} />
          </div>
          <div>
            <h1>Reset Password</h1>
            <p>Update your account password securely.</p>
          </div>
        </div>

        {error && (
          <div className="message error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="message success">
            <CheckCircle2 size={18} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="reset-password-form">
          <label>Current Password</label>
          <div className="password-input">
            <input
              type={show.current ? "text" : "password"}
              name="currentPassword"
              value={form.currentPassword}
              onChange={handleChange}
              placeholder="Enter your current password"
            />
            <button
              type="button"
              onClick={() => setShow({ ...show, current: !show.current })}
            >
              {show.current ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <label>New Password</label>
          <div className="password-input">
            <input
              type={show.next ? "text" : "password"}
              name="newPassword"
              value={form.newPassword}
              onChange={handleChange}
              placeholder="Enter your new password"
            />
            <button
              type="button"
              onClick={() => setShow({ ...show, next: !show.next })}
            >
              {show.next ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <label>Confirm New Password</label>
          <div className="password-input">
            <input
              type={show.confirm ? "text" : "password"}
              name="confirmNewPassword"
              value={form.confirmNewPassword}
              onChange={handleChange}
              placeholder="Confirm your new password"
            />
            <button
              type="button"
              onClick={() =>
                setShow({ ...show, confirm: !show.confirm })
              }
            >
              {show.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}