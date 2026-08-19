import { Route, Routes , Navigate} from 'react-router-dom';
import MainLayout from '@/layouts/MainLayout';
import GerritDashboardPage from '@/pages/GerritDashboardPage';
import SignInPage from '@/pages/SignInPage';
import DevelopersPage from '@/pages/DevelopersPage';
import ProjectsPage from '@/pages/ProjectsPage';
import DeveloperDetailPage from '@/pages/DeveloperDetailPage';
import ProjectDetailPage from '@/pages/ProjectDetailPage';
import TeamPerformancePage from '@/pages/TeamPerformancePage';
import JiraAnalysisPage from '@/pages/JiraAnalysisPage';

const App: React.FC = () => {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/gerrit" />} />
        <Route path="/gerrit" element={<GerritDashboardPage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/gerrit/developers" element={<DevelopersPage />} />
        <Route path="/gerrit/developers/:username" element={<DeveloperDetailPage />} />
        <Route path="/gerrit/projects" element={<ProjectsPage />} />
        <Route path="/gerrit/projects/:project" element={<ProjectDetailPage />} />
        <Route path="/gerrit/teams/:teamId" element={<TeamPerformancePage />}/>
        <Route path="/jira" element={<JiraAnalysisPage />} />
    
      </Routes>
    </MainLayout>
  );
};

export default App;
