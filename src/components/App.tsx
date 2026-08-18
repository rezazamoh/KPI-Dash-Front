import { Route, Routes } from 'react-router-dom';
import MainLayout from '@/layouts/MainLayout';
import DashboardPage from '@/pages/DashboardPage';
import SignInPage from '@/pages/SignInPage';
import DevelopersPage from '@/pages/DevelopersPage';
import ProjectsPage from '@/pages/ProjectsPage';
import DeveloperDetailPage from '@/pages/DeveloperDetailPage';
import ProjectDetailPage from '@/pages/ProjectDetailPage';
import JiraAnalysisPage from '@/pages/JiraAnalysisPage';

const App: React.FC = () => {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/gerrit/developers" element={<DevelopersPage />} />
        <Route path="/gerrit/developers/:username" element={<DeveloperDetailPage />} />
        <Route path="/gerrit/projects" element={<ProjectsPage />} />
        <Route path="/gerrit/projects/:project" element={<ProjectDetailPage />} />
        <Route path="/jira/analysis" element={<JiraAnalysisPage />} />
      </Routes>
    </MainLayout>
  );
};

export default App;
