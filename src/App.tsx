import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import FaceLogin from './components/FaceLogin';
import AdminDashboard from './components/AdminDashboard';
import VoterInterface from './components/VoterInterface';
import { ROUTES } from './utils/constants';

const App: React.FC = () => {
  return (
    <Router>
      <div style={{ minHeight: '100vh' }}>
        <Routes>
          <Route path={ROUTES.HOME} element={<FaceLogin />} />
          <Route path={ROUTES.ADMIN} element={<AdminDashboard />} />
          <Route path={ROUTES.VOTE} element={<VoterInterface />} />
          <Route path="*" element={<Navigate to={ROUTES.HOME} replace />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;