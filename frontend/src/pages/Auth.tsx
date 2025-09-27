import AuthForm from "@/components/auth/AuthForm";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

const Auth = () => {
  const { user, loading } = useAuth();

  // Redirect to home if already authenticated
  if (user && !loading) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navigation />
      <AuthForm />
    </div>
  );
};

export default Auth;