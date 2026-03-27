import { Routes, Route, Navigate } from "react-router-dom";
import "leaflet/dist/leaflet.css";

// QA and Interviews pages
import QAPage from "./pages/QAPage";
import RecruiterInterviewsPage from "./pages/RecruiterInterviewPage";

// login pages
import LoginPage from "./pages/LoginPage/LoginPage";
import SignupPage from "./pages/LoginPage/SignupPage";
import ForgotPasswordPage from "./pages/LoginPage/ForgotPasswordPage";
import ResetPasswordPage from "./pages/LoginPage/ResetPasswordPage";
import OAuthCallbackPage from "./pages/LoginPage/OAuthCallbackPage";
import EmailConfirmed from "./pages/LoginPage/EmailConfirmed";

// logged-in account password change page
import ChangePasswordPage from "./pages/ChangePasswordPage";

// job details pages
import ProfileReviewPage from "./pages/JobDetails/ProfileReviewPage";
import ApplicationReviewPage from "./pages/JobDetails/ApplicationReviewPage";
import AssessmentPage from "./pages/JobDetails/AssesmentsPage";
import ApplicationResultPage from "./pages/JobDetails/ApplicationResultPage";
import JobDetailsPage from "./pages/JobDetails/JobDetailsPage";
import AssessmentRulesPage from "./pages/JobDetails/AssesmentRulesPage";

// matches page
import MatchesPage from "./pages/MatchesPage";

// organization page
import OrganizationDashboard from "./pages/OrganizationDashboard";


// Admin panel
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminCompanies from "./pages/admin/AdminCompanies";
import AdminRecruiters from "./pages/admin/AdminRecruiters";
import AdminStudents from "./pages/admin/AdminStudents";
import AdminSettings from "./pages/admin/AdminSettings";

// Layouts
import AppLayout from "./layout/AppLayout";
import AdminLayout from "./layout/AdminLayout";

import { BrowseOpportunities } from "./pages/BrowseOpportunities";
import ProfilePage from "./pages/ProfilePage";
import Dashboard from "./pages/Dashboard";

import Applicants from "./pages/applicants";
import NotificationsPage from "./pages/NotificationPage";
import ApplicantProfilePage from "./pages/ApplicantsProfilePage";

// ─────────────────────────────────────────────
// AUTH HELPERS
// ─────────────────────────────────────────────

function getUser() {
    try {
        const parsed = JSON.parse(localStorage.getItem("jobify_user"));
        if (!parsed) return null;
        return parsed;
    } catch {
        return null;
    }
}

function AdminGuard() {
    const user = getUser();
    const isAdmin = user?.roles?.[0] === "Admin";


    if (!user) return <Navigate to="/login" replace />;
    if (!isAdmin) return <Navigate to="/dashboard" replace />;


    return <AdminLayout />;
}

function AppGuard() {
    const user = getUser();
    const isAdmin = user?.roles?.[0] === "Admin";


    if (!user) return <Navigate to="/login" replace />;
    if (isAdmin) return <Navigate to="/admin" replace />;


    return <AppLayout />;
}

// ─────────────────────────────────────────────
// APP
// ─────────────────────────────────────────────

export default function App() {
    const user = getUser();
    const isAdmin = user?.roles?.[0] === "Admin";

    return (
        <Routes>
            {/* PUBLIC ROUTES */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/oauth-confirm" element={<OAuthCallbackPage />} />
            <Route path="/email-confirmed" element={<EmailConfirmed />} />

            {/* ADMIN ROUTES */}
            <Route element={<AdminGuard />}>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/students" element={<AdminStudents />} />
                <Route path="/admin/recruiters" element={<AdminRecruiters />} />
                <Route path="/admin/companies" element={<AdminCompanies />} />
                <Route path="/admin/settings" element={<AdminSettings />} />
            </Route>

            {/* APP ROUTES */}
            <Route element={<AppGuard />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/browse" element={<BrowseOpportunities />} />
                <Route path="/match" element={<MatchesPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />

                {/* ORGANIZATION */}
                <Route path="/organization" element={<OrganizationDashboard />} />
                <Route path="/organization/interviews" element={<RecruiterInterviewsPage />} />
                <Route path="/organization/qanda" element={<QAPage />} />
                <Route path="/organization/applicants" element={<Applicants />} />
                <Route
                    path="/organization/applicants/:applicationId/profile"
                    element={<ApplicantProfilePage />}
                />

                {/* JOB FLOW */}
                <Route path="/opportunities/:id" element={<JobDetailsPage />} />
                <Route path="/apply/:applicationId/review" element={<ProfileReviewPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/change-password" element={<ChangePasswordPage />} />
                <Route path="/application/:applicationId/review" element={<ApplicationReviewPage />} />
                <Route path="/application/:applicationId/assessment/rules" element={<AssessmentRulesPage />} />
                <Route path="/application/:applicationId/assessment/start" element={<AssessmentPage />} />
                <Route path="/application/:applicationId/assessment" element={<AssessmentPage />} />
                <Route path="/application/:applicationId/result" element={<ApplicationResultPage />} />

                {/* PROFILE */}
                <Route path="/profile" element={<ProfilePage />} />
            </Route>

            {/* FALLBACK */}
            <Route
                path="*"
                element={
                    !user ? (
                        <Navigate to="/login" replace />
                    ) : (
                        <Navigate to={isAdmin ? "/admin" : "/dashboard"} replace />
                    )
                }
            />
        </Routes>
    );
}
