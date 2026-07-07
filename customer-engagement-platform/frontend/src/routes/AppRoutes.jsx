import { Routes, Route } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import ProtectedRoute from './ProtectedRoute';
import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import ExecutiveWorkspacePage from '../pages/ExecutiveWorkspacePage';
import TicketsPage from '../pages/TicketsPage';
import TicketDetailPage from '../pages/TicketDetailPage';
import LeadsPage from '../pages/LeadsPage';
import LeadDetailPage from '../pages/LeadDetailPage';
import NotFoundPage from '../pages/NotFoundPage';
import AdminLayout from '../features/admin-portal/layouts/AdminLayout';
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import KnowledgeManagementPage from '../pages/admin/KnowledgeManagementPage';
import PromptManagementPage from '../pages/admin/PromptManagementPage';
import AISettingsPage from '../pages/admin/AISettingsPage';
import WidgetSettingsPage from '../pages/admin/WidgetSettingsPage';
import ExecutiveManagementPage from '../pages/admin/ExecutiveManagementPage';
import BusinessHoursPage from '../pages/admin/BusinessHoursPage';
import AnalyticsPage from '../pages/admin/AnalyticsPage';
import { ROUTES } from '../constants/routes';
import { ROLES } from '../constants/roles';

function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path={ROUTES.HOME} element={<HomePage />} />
        <Route path={ROUTES.LOGIN} element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path={ROUTES.DASHBOARD} element={<ExecutiveWorkspacePage />} />
          <Route path={ROUTES.TICKETS} element={<TicketsPage />} />
          <Route path={`${ROUTES.TICKETS}/:id`} element={<TicketDetailPage />} />
          <Route path={ROUTES.LEADS} element={<LeadsPage />} />
          <Route path={`${ROUTES.LEADS}/:id`} element={<LeadDetailPage />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]} />}>
          <Route element={<AdminLayout />}>
            <Route path={ROUTES.ADMIN_DASHBOARD} element={<AdminDashboardPage />} />
            <Route path={ROUTES.ADMIN_KNOWLEDGE} element={<KnowledgeManagementPage />} />
            <Route path={ROUTES.ADMIN_PROMPTS} element={<PromptManagementPage />} />
            <Route path={ROUTES.ADMIN_AI_SETTINGS} element={<AISettingsPage />} />
            <Route path={ROUTES.ADMIN_WIDGET_SETTINGS} element={<WidgetSettingsPage />} />
            <Route path={ROUTES.ADMIN_EXECUTIVES} element={<ExecutiveManagementPage />} />
            <Route path={ROUTES.ADMIN_BUSINESS_HOURS} element={<BusinessHoursPage />} />
            <Route path={ROUTES.ADMIN_ANALYTICS} element={<AnalyticsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default AppRoutes;
