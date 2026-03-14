import { useState } from "react";
import Hero from "@/components/landing/Hero";
import ValueProps from "@/components/landing/ValueProps";
import HowItWorks from "@/components/landing/HowItWorks";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";
import Dashboard from "@/components/dashboard/Dashboard";

type AppView = "landing" | "onboarding" | "dashboard";

const Index = () => {
  const [view, setView] = useState<AppView>("landing");

  if (view === "onboarding") {
    return <OnboardingWizard onComplete={() => setView("dashboard")} />;
  }

  if (view === "dashboard") {
    return <Dashboard onLogout={() => setView("landing")} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Hero onGetStarted={() => setView("onboarding")} />
      <ValueProps />
      <HowItWorks />

      {/* Footer */}
      <footer className="py-12 bg-secondary text-secondary-foreground" dir="rtl">
        <div className="container text-center">
          <p className="text-sm opacity-80">© 2026 הבית — כל הזכויות שמורות</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
