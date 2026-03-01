import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import RetailerDashboard from './pages/RetailerDashboard';
import PostJob from './pages/PostJob';
import JobDetails from './pages/JobDetails';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route element={<Layout />}>
          {/* Student Routes */}
          <Route path="/jobs" element={<Home />} />
          <Route path="/jobs/:id" element={<JobDetails />} />

          {/* Retailer Routes */}
          <Route path="/retailer" element={<RetailerDashboard />} />
          <Route path="/retailer/post-job" element={<PostJob />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
