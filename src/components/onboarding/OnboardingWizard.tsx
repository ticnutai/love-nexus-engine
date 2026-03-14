import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft, Heart } from "lucide-react";

interface FormData {
  firstName: string;
  gender: string;
  age: string;
  city: string;
  religiousLevel: string;
  education: string;
  occupation: string;
  aboutMe: string;
  lookingFor: string;
  familyValues: string;
  partnerAgeMin: string;
  partnerAgeMax: string;
}

const initialData: FormData = {
  firstName: "",
  gender: "",
  age: "",
  city: "",
  religiousLevel: "",
  education: "",
  occupation: "",
  aboutMe: "",
  lookingFor: "",
  familyValues: "",
  partnerAgeMin: "",
  partnerAgeMax: "",
};

const OnboardingWizard = ({ onComplete }: { onComplete: () => void }) => {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<FormData>(initialData);

  const update = (field: keyof FormData, value: string) => {
    setData((prev) => ({ ...prev, [field]: value }));
  };

  const steps = [
    // Step 0: Basic info
    <div key="basic" className="space-y-6" dir="rtl">
      <h2 className="text-2xl font-bold text-foreground">ספרו לנו על עצמכם</h2>
      <p className="text-muted-foreground">מידע בסיסי שיעזור לנו להכיר אתכם</p>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">שם פרטי</label>
          <input
            className="w-full h-12 px-4 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
            value={data.firstName}
            onChange={(e) => update("firstName", e.target.value)}
            placeholder="השם שלכם"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">מגדר</label>
          <div className="grid grid-cols-2 gap-3">
            {["גבר", "אישה"].map((g) => (
              <button
                key={g}
                onClick={() => update("gender", g)}
                className={`h-12 rounded-lg border-2 font-medium transition-all duration-200 ${
                  data.gender === g
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input bg-background text-muted-foreground hover:border-primary/50"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">גיל</label>
            <input
              type="number"
              className="w-full h-12 px-4 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
              value={data.age}
              onChange={(e) => update("age", e.target.value)}
              placeholder="25"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">עיר מגורים</label>
            <input
              className="w-full h-12 px-4 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
              value={data.city}
              onChange={(e) => update("city", e.target.value)}
              placeholder="תל אביב"
            />
          </div>
        </div>
      </div>
    </div>,

    // Step 1: Background
    <div key="background" className="space-y-6" dir="rtl">
      <h2 className="text-2xl font-bold text-foreground">רקע והשכלה</h2>
      <p className="text-muted-foreground">עזרו לנו להבין את העולם שלכם</p>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">רמת דתיות</label>
          <div className="grid grid-cols-2 gap-3">
            {["חילוני", "מסורתי", "דתי", "חרדי"].map((level) => (
              <button
                key={level}
                onClick={() => update("religiousLevel", level)}
                className={`h-12 rounded-lg border-2 font-medium transition-all duration-200 ${
                  data.religiousLevel === level
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input bg-background text-muted-foreground hover:border-primary/50"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">השכלה</label>
          <input
            className="w-full h-12 px-4 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
            value={data.education}
            onChange={(e) => update("education", e.target.value)}
            placeholder="תואר ראשון, תואר שני..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">עיסוק</label>
          <input
            className="w-full h-12 px-4 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
            value={data.occupation}
            onChange={(e) => update("occupation", e.target.value)}
            placeholder="מהנדס/ת, מורה, עו״ד..."
          />
        </div>
      </div>
    </div>,

    // Step 2: Values & personality
    <div key="values" className="space-y-6" dir="rtl">
      <h2 className="text-2xl font-bold text-foreground">ערכים ואישיות</h2>
      <p className="text-muted-foreground">מה באמת חשוב לכם בחיים ובזוגיות?</p>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">ספרו על עצמכם</label>
          <textarea
            className="w-full h-28 px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring focus:outline-none resize-none"
            value={data.aboutMe}
            onChange={(e) => update("aboutMe", e.target.value)}
            placeholder="מה עושה אתכם מיוחדים? מה אתם אוהבים? מה חשוב לכם?"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">ערכים משפחתיים</label>
          <textarea
            className="w-full h-28 px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring focus:outline-none resize-none"
            value={data.familyValues}
            onChange={(e) => update("familyValues", e.target.value)}
            placeholder="איזה בית אתם רוצים לבנות? מה החזון שלכם למשפחה?"
          />
        </div>
      </div>
    </div>,

    // Step 3: Partner preferences
    <div key="partner" className="space-y-6" dir="rtl">
      <h2 className="text-2xl font-bold text-foreground">מה אתם מחפשים?</h2>
      <p className="text-muted-foreground">תארו את בן/בת הזוג האידיאלי/ת</p>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">טווח גילאים מועדף</label>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="number"
              className="w-full h-12 px-4 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
              value={data.partnerAgeMin}
              onChange={(e) => update("partnerAgeMin", e.target.value)}
              placeholder="מגיל"
            />
            <input
              type="number"
              className="w-full h-12 px-4 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring focus:outline-none"
              value={data.partnerAgeMax}
              onChange={(e) => update("partnerAgeMax", e.target.value)}
              placeholder="עד גיל"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">מה אתם מחפשים בבן/בת זוג?</label>
          <textarea
            className="w-full h-32 px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:ring-2 focus:ring-ring focus:outline-none resize-none"
            value={data.lookingFor}
            onChange={(e) => update("lookingFor", e.target.value)}
            placeholder="תכונות אופי, ערכים, דברים שחשובים לכם בבן/בת זוג..."
          />
        </div>
      </div>
    </div>,
  ];

  const totalSteps = steps.length;
  const isLast = step === totalSteps - 1;
  const isFirst = step === 0;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-lg">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-muted-foreground">שלב {step + 1} מתוך {totalSteps}</span>
            <Heart className="w-5 h-5 text-primary animate-pulse-soft" />
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full gradient-hero rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((step + 1) / totalSteps) * 100}%` }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl shadow-elevated p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {steps[step]}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t border-border">
            <Button
              variant="ghost"
              onClick={() => setStep((s) => s - 1)}
              disabled={isFirst}
              className="gap-2"
            >
              <ArrowRight className="w-4 h-4" />
              הקודם
            </Button>
            {isLast ? (
              <Button variant="hero" size="lg" onClick={onComplete} className="gap-2">
                סיימו והתחילו
                <Heart className="w-4 h-4" />
              </Button>
            ) : (
              <Button onClick={() => setStep((s) => s + 1)} className="gap-2">
                הבא
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingWizard;
