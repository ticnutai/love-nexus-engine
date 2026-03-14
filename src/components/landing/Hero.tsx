import { motion } from "framer-motion";
import { Heart, Shield, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-illustration.jpg";

interface HeroProps {
  onGetStarted: () => void;
}

const Hero = ({ onGetStarted }: HeroProps) => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden" dir="rtl">
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="הבית - שידוכים"
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 gradient-warm opacity-90" />
      </div>

      <div className="container relative z-10 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-8">
              <Heart className="w-4 h-4" />
              <span className="text-sm font-medium">שידוכים מותאמים אישית</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight">
              הבית
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-4 font-light">
              המקום שבו נשמות מוצאות את הדרך הביתה
            </p>
            <p className="text-base text-muted-foreground mb-10 max-w-xl mx-auto">
              מערכת שידוכים משוכללת המבוססת על ערכים, אישיות והתאמה עמוקה.
              לא עוד החלקות — אלא חיבורים אמיתיים.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button variant="hero" size="xl" onClick={onGetStarted}>
              התחילו את המסע
            </Button>
            <Button variant="hero-outline" size="xl">
              למדו עוד
            </Button>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-16 flex flex-wrap justify-center gap-8"
          >
            {[
              { icon: Shield, text: "פרטיות מלאה", sub: "המידע שלכם מוגן" },
              { icon: Star, text: "התאמה חכמה", sub: "אלגוריתם מתקדם" },
              { icon: Heart, text: "חיבורים אמיתיים", sub: "לא רק תמונות" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-right">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.text}</p>
                  <p className="text-xs text-muted-foreground">{item.sub}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
