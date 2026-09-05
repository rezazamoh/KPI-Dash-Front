import { Route, Routes , Navigate} from 'react-router-dom';
import MainLayout from '@/layouts/MainLayout';
import GerritDashboardPage from '@/pages/GerritDashboardPage';
import SignInPage from '@/pages/SignInPage';
import DeveloperDetailPage from '@/pages/DeveloperDetailPage';
import GerritDetailPage from '@/pages/GerritDetailPage';
import JiraAnalysisPage from '@/pages/JiraAnalysisPage';
import SettingsPage from '@/pages/SettingsPage';

const App = () => {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/gerrit" />} />
        <Route path="/gerrit" element={<GerritDashboardPage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/gerrit/developers/:username" element={<DeveloperDetailPage />}/>
        <Route path="/gerrit/projects/:project" element={<GerritDetailPage />}/>
        <Route path="/gerrit/teams/:team"element={<GerritDetailPage />}/>
        <Route path="/jira" element={<JiraAnalysisPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </MainLayout>
  );
};

export default App;
