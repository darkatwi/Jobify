import { Routes, Route, Navigate } from "react-router-dom";
import "leaflet/dist/leaflet.css";

// login pages
import LoginPage from "./pages/LoginPage/LoginPage";
import SignupPage from "./pages/LoginPage/SignupPage";
import ForgotPasswordPage from "./pages/LoginPage/ForgotPasswordPage";
import ResetPasswordPage from "./pages/LoginPage/ResetPasswordPage";
import OAuthCallbackPage from "./pages/LoginPage/OAuthCallbackPage";
import EmailConfirmed from "./pages/LoginPage/EmailConfirmed";

// job details pages
import ProfileReviewPage from "./pages/JobDetails/ProfileReviewPage";
import ApplicationReviewPage from "./pages/JobDetails/ApplicationReviewPage";
import AssessmentPage from "./pages/JobDetails/AssesmentsPage";
import ApplicationResultPage from "./pages/JobDetails/ApplicationResultPage";
import JobDetailsPage from "./pages/JobDetails/JobDetailsPage";
import AssessmentRulesPage from "./pages/JobDetails/AssesmentRulesPage";

import Match from "./pages/Match";

// organization page
import OrganizationDashboard from "./pages/OrganizationDashboard";

import AppLayout from "./layout/AppLayout";

import { BrowseOpportunities } from "./pages/BrowseOpportunities";
import ProfilePage from "./pages/ProfilePage";
import Dashboard from "./pages/Dashboard";

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/oauth-confirm" element={<OAuthCallbackPage />} />
            <Route path="/email-confirmed" element={<EmailConfirmed />} />

            <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/browse" element={<BrowseOpportunities />} />
                
                <Route path="/organization" element={<OrganizationDashboard />} />
                <Route path="/opportunities/:id" element={<JobDetailsPage />} />
                <Route path="/apply/:applicationId/review" element={<ProfileReviewPage />} />
                <Route path="/matches" element={<Match />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/application/:applicationId/review" element={<ApplicationReviewPage />} />
                <Route path="/application/:applicationId/assessment/rules" element={<AssessmentRulesPage />} />
                <Route path="/application/:applicationId/assessment" element={<AssessmentPage />} />
                <Route path="/application/:applicationId/result" element={<ApplicationResultPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
    );
}