import { Route, Routes } from 'react-router-dom';
import MainLayout from '@/layouts/MainLayout';
import DashboardPage from '@/pages/DashboardPage';
import SignInPage from '@/pages/SignInPage';
import DevelopersPage from '@/pages/DevelopersPage';
import ProjectsPage from '@/pages/ProjectsPage';
import DeveloperDetailPage from '@/pages/DeveloperDetailPage';
import ProjectDetailPage from '@/pages/ProjectDetailPage';

const App: React.FC = () => {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/developers" element={<DevelopersPage />} />
        <Route path="/developers/:username" element={<DeveloperDetailPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:project" element={<ProjectDetailPage />} />
      </Routes>
    </MainLayout>
  );
};

export default App;
