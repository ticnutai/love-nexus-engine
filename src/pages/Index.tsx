import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Hero from "@/components/landing/Hero";
import ValueProps from "@/components/landing/ValueProps";
import HowItWorks from "@/components/landing/HowItWorks";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import Dashboard from "@/components/dashboard/Dashboard";

type AppView = "landing" | "onboarding" | "dashboard";

const Index = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<AppView>(user ? "dashboard" : "landing");

  const handleGetStarted = () => {
    if (user) {
      setView("onboarding");
    } else {
      navigate("/auth");
    }
  };

  if (user && view === "dashboard") {
    return <Dashboard onLogout={async () => { await signOut(); setView("landing"); }} />;
  }

  if (user && view === "onboarding") {
    return <OnboardingWizard onComplete={() => setView("dashboard")} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Hero onGetStarted={handleGetStarted} />
      <ValueProps />
      <HowItWorks />
      <footer className="py-12 bg-secondary text-secondary-foreground" dir="rtl">
        <div className="container text-center">
          <p className="text-sm opacity-80">© 2026 הבית — כל הזכויות שמורות</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
