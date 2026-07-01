import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';

import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import Home from '@/pages/Home';
import AddRepository from '@/pages/AddRepository';
import ProjectDetailWithReadiness from '@/pages/ProjectDetailWithReadiness';
import ProductQualityDashboard from '@/pages/ProductQualityDashboard';
import ProductHealth from '@/pages/ProductHealth';
import WorkspaceQuality from '@/pages/WorkspaceQuality';
import WorkspaceOptions from '@/pages/WorkspaceOptions';
import ImpactAnalysisWithEfficiency from '@/pages/ImpactAnalysisWithEfficiency';
import ImpactLauncher from '@/pages/ImpactLauncher';
import PullRequestInbox from '@/pages/PullRequestInbox';
import RiskMemory from '@/pages/RiskMemory';
import ProjectRules from '@/pages/ProjectRules';
import MissingContextImportQueue from '@/pages/MissingContextImportQueue';
import CodeSearch from '@/pages/CodeSearch';
import ArchitectureOverview from '@/pages/ArchitectureOverview';
import GraphLens from '@/pages/GraphLens';
import ProjectDecisions from '@/pages/ProjectDecisions';
import McpSetup from '@/pages/McpSetup';
import RuntimeDiagnostics from '@/pages/RuntimeDiagnostics';
import InstalledRepositories from '@/pages/InstalledRepositories';
import AppLayout from '@/components/layout/AppLayout';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgotPassword" element={<ForgotPassword />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/resetPassword" element={<ResetPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/add" element={<AddRepository />} />
          <Route path="/impact" element={<ImpactLauncher />} />
          <Route path="/diagnostics" element={<RuntimeDiagnostics />} />
          <Route path="/github/repositories" element={<InstalledRepositories />} />
          <Route path="/workspace/quality" element={<WorkspaceQuality />} />
          <Route path="/workspace/settings" element={<WorkspaceOptions />} />
          <Route path="/workspace/health" element={<ProductHealth />} />
          <Route path="/project/:id" element={<ProjectDetailWithReadiness />} />
          <Route path="/project/:id/quality" element={<ProductQualityDashboard />} />
          <Route path="/project/:id/search" element={<CodeSearch />} />
          <Route path="/project/:id/architecture" element={<ArchitectureOverview />} />
          <Route path="/project/:id/graph" element={<GraphLens />} />
          <Route path="/project/:id/decisions" element={<ProjectDecisions />} />
          <Route path="/project/:id/mcp" element={<McpSetup />} />
          <Route path="/project/:id/impact" element={<ImpactAnalysisWithEfficiency />} />
          <Route path="/project/:id/pr-inbox" element={<PullRequestInbox />} />
          <Route path="/project/:id/import-queue" element={<MissingContextImportQueue />} />
          <Route path="/project/:id/risk-memory" element={<RiskMemory />} />
          <Route path="/project/:id/rules" element={<ProjectRules />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
