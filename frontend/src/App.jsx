import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import RetailerDashboard from './pages/RetailerDashboard';
import PostJob from './pages/PostJob';
import JobDetails from './pages/JobDetails';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import StudentSetup from './pages/StudentSetup';
import StudentProfilePage from './pages/StudentProfilePage';
import StudentApplications from './pages/StudentApplications';
import StudentWishlist from './pages/StudentWishlist';
import RetailerProfilePage from './pages/RetailerProfilePage';
import Inbox from './pages/Inbox';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/student/setup" element={<StudentSetup />} />
        <Route element={<Layout />}>
          {/* Student Routes */}
          <Route path="/jobs" element={<Home />} />
          <Route path="/jobs/:id" element={<JobDetails />} />
          <Route path="/student/profile" element={<StudentProfilePage />} />
          <Route path="/student/applications" element={<StudentApplications />} />
          <Route path="/student/wishlist" element={<StudentWishlist />} />
          <Route path="/inbox" element={<Inbox />} />

          {/* Retailer Routes */}
          <Route path="/retailer" element={<RetailerDashboard />} />
          <Route path="/retailer/post-job" element={<PostJob />} />
          <Route path="/retailer/profile" element={<RetailerProfilePage />} />
        </Route>

        {/* Hidden Admin Routes (No Layout/Navbar) */}
        <Route path="/admin-portal" element={<AdminLogin />} />
        <Route path="/admin-portal/dashboard" element={<AdminDashboard />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
