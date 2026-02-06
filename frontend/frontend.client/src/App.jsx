import { Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "./pages/LoginPage/LoginPage";
import SignupPage from "./pages/LoginPage/SignupPage";
import ForgotPasswordPage from "./pages/LoginPage/ForgotPasswordPage";
import ResetPasswordPage from "./pages/LoginPage/ResetPasswordPage";
import OAuthCallbackPage from "./pages/LoginPage/OAuthCallbackPage";
import EmailConfirmed from "./pages/LoginPage/EmailConfirmed";


import AppLayout from "./layout/AppLayout";

import { BrowseOpportunities } from "./pages/BrowseOpportunities";

// placeholder pages (create later if you want)
const Dashboard = () => <div>Dashboard</div>;
const Matches = () => <div>Matches</div>;
const Profile = () => <div>Profile</div>;

export default function App() {
    return (
        <Routes>
            {/* Public / Auth routes */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/oauth-confirm" element={<OAuthCallbackPage />} />

            <Route path="/email-confirmed" element={<EmailConfirmed />} />


            {/* ✅ Protected / App layout routes */}
            <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/browse" element={<BrowseOpportunities />} />
                <Route path="/matches" element={<Matches />} />
                <Route path="/profile" element={<Profile />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    );
}
