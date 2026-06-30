import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { useAuth } from '@/hooks/useAuth';
import { Toaster } from '@/components/ui/toaster';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { Loader2 } from 'lucide-react';

// Pages
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import StudentDashboard from '@/pages/StudentDashboard';
import CourseList from '@/pages/CourseList';
import CourseDetail from '@/pages/CourseDetail';
import CreateCourse from '@/pages/CreateCourse';
import EditCourse from '@/pages/EditCourse';

// Search Pages
import SearchResults from '@/pages/SearchResults';
import SearchHistory from '@/pages/SearchHistory';

// Teacher Pages
import TeacherDashboard from '@/pages/TeacherDashboard';
import CourseOverview from '@/pages/teacher/CourseOverview';
import StudentList from '@/pages/teacher/StudentList';
import StudentDetail from '@/pages/teacher/StudentDetail';
import CourseAnalytics from '@/pages/teacher/CourseAnalytics';
import CourseSettings from '@/pages/teacher/CourseSettings';
import CreateBadge from '@/pages/teacher/CreateBadge';
import DonationHistory from '@/pages/teacher/DonationHistory';

// Module & Lesson Pages
import ModuleDetail from '@/pages/modules/ModuleDetail';
import CreateModule from '@/pages/modules/CreateModule';
import EditModule from '@/pages/modules/EditModule';
import CreateLesson from '@/pages/lessons/CreateLesson';
import EditLesson from '@/pages/lessons/EditLesson';
import LessonPage from '@/pages/lessons/LessonPage';

// Quiz Pages
import CreateQuiz from '@/pages/quizzes/CreateQuiz';
import EditQuiz from '@/pages/quizzes/EditQuiz';
import QuizPage from '@/pages/quizzes/QuizPage';
import TeacherQuizStats from '@/pages/quizzes/TeacherQuizStats';

// Forum Pages
import ForumList from '@/pages/forum/ForumList';
import CreateDiscussion from '@/pages/forum/CreateDiscussion';
import DiscussionDetail from '@/pages/forum/DiscussionDetail';

// Badge & Certificate Pages
import MyBadges from '@/pages/student/MyBadges';
import MyCertificates from '@/pages/student/MyCertificates';
import StudentDonationHistory from '@/pages/student/StudentDonationHistory';

// Student Profile
import EditProfile from '@/pages/student/EditProfile';

// Admin Pages
import AdminDonationHistory from '@/pages/admin/AdminDonationHistory';

// Notification Pages
import NotificationHistory from '@/pages/NotificationHistory';
import NotificationPreferences from '@/pages/NotificationPreferences';

// Component to handle role-based redirect
const DashboardRedirect = () => {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect based on role
  switch (role) {
    case 'instructor':
    case 'teacher':
    case 'professor': // Added professor
      return <Navigate to="/dashboard/teacher" replace />;
    case 'admin':
      return <Navigate to="/admin/donations" replace />;
    case 'student':
    default:
      return <Navigate to="/dashboard/student" replace />;
  }
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-background font-sans antialiased">
          <Navbar />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            
            {/* Public Course Routes */}
            <Route path="/courses" element={<CourseList />} />
            <Route path="/courses/:courseId" element={<CourseDetail />} />

            {/* Search Routes */}
            <Route path="/search" element={<SearchResults />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              {/* Intelligent Dashboard Redirect */}
              <Route path="/dashboard" element={<DashboardRedirect />} />
              
              {/* Search History */}
              <Route path="/search/history" element={<SearchHistory />} />
              
              {/* Student Routes */}
              <Route path="/dashboard/student" element={<StudentDashboard />} />
              <Route path="/dashboard/student/profile" element={<EditProfile />} />
              <Route path="/dashboard/student/badges" element={<MyBadges />} />
              <Route path="/dashboard/student/certificates" element={<MyCertificates />} />
              <Route path="/dashboard/student/donations" element={<StudentDonationHistory />} />
              
              {/* Learning Routes */}
              <Route path="/courses/:courseId/modules/:moduleId" element={<ModuleDetail />} />
              <Route path="/courses/:courseId/modules/:moduleId/lessons/:lessonId" element={<LessonPage />} />
              <Route path="/courses/:courseId/modules/:moduleId/quizzes/:quizId" element={<QuizPage />} />
              
              {/* Forum Routes */}
              <Route path="/forum" element={<ForumList />} />
              <Route path="/forum/create" element={<CreateDiscussion />} />
              <Route path="/forum/discussion/:discussionId" element={<DiscussionDetail />} />

              {/* Teacher Routes - Dashboard & Courses */}
              <Route path="/dashboard/teacher" element={<TeacherDashboard />} />
              <Route path="/teacher-dashboard" element={<TeacherDashboard />} /> {/* New Alias for Teacher Dashboard */}
              <Route path="/dashboard/teacher/donations" element={<DonationHistory />} />
              <Route path="/dashboard/teacher/courses/:courseId" element={<CourseOverview />} />
              <Route path="/dashboard/teacher/courses/:courseId/students" element={<StudentList />} />
              <Route path="/dashboard/teacher/courses/:courseId/students/:studentId" element={<StudentDetail />} />
              <Route path="/dashboard/teacher/courses/:courseId/analytics" element={<CourseAnalytics />} />
              <Route path="/dashboard/teacher/courses/:courseId/settings" element={<CourseSettings />} />

              {/* Teacher Routes - Content Management */}
              <Route path="/courses/create" element={<CreateCourse />} />
              <Route path="/courses/:courseId/edit" element={<EditCourse />} />
              <Route path="/courses/:courseId/modules/create" element={<CreateModule />} />
              <Route path="/dashboard/teacher/modules/:moduleId/edit" element={<EditModule />} />
              <Route path="/dashboard/teacher/modules/:moduleId/lessons/create" element={<CreateLesson />} />
              <Route path="/dashboard/teacher/modules/:moduleId/lessons/:lessonId/edit" element={<EditLesson />} />

              {/* Teacher Routes - Quizzes */}
              <Route path="/dashboard/teacher/modules/:moduleId/quizzes/create" element={<CreateQuiz />} />
              <Route path="/dashboard/teacher/quizzes/:quizId/edit" element={<EditQuiz />} />
              <Route path="/dashboard/teacher/quizzes/:quizId/stats" element={<TeacherQuizStats />} />
              
              {/* Teacher Routes - Badges */}
              <Route path="/dashboard/teacher/quizzes/:quizId/create-badge" element={<CreateBadge />} />

              {/* Admin Routes */}
              <Route path="/admin/donations" element={<AdminDonationHistory />} />
              
              {/* Notification Routes */}
              <Route path="/notifications" element={<NotificationHistory />} />
              <Route path="/settings/notifications" element={<NotificationPreferences />} />

            </Route>
          </Routes>
          <Toaster />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;