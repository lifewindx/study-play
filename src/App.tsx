import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { ClassesPage } from "./pages/ClassesPage";
import { LessonPage } from "./pages/LessonPage";
import { PlayerPage } from "./pages/PlayerPage";
import { CalendarPage } from "./pages/CalendarPage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { MyPage } from "./pages/MyPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { ThemeProvider } from "./hooks/useTheme";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import type { ReactNode } from "react";

function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ color: "var(--text-muted)" }}>
        Loading...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/*"
        element={
          <AuthGuard>
            <Layout>
              <Routes>
                <Route path="/" element={<Navigate to="/classes" replace />} />
                <Route path="/classes" element={<ClassesPage />} />
                <Route path="/classes/:classId" element={<LessonPage />} />
                <Route path="/lesson/:lessonId" element={<PlayerPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/mypage" element={<MyPage />} />
              </Routes>
            </Layout>
          </AuthGuard>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
