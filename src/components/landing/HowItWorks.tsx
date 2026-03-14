import { motion } from "framer-motion";
import { ClipboardList, Search, MessageCircleHeart, Home } from "lucide-react";

const steps = [
  { icon: ClipboardList, title: "מלאו פרופיל מעמיק", description: "שאלון מפורט שעוזר לנו להכיר אתכם באמת" },
  { icon: Search, title: "המערכת מאתרת התאמות", description: "אלגוריתם חכם שמשקלל ערכים, אישיות והעדפות" },
  { icon: MessageCircleHeart, title: "היכרות מעמיקה", description: "שיחה במרחב פרטי ומוגן עם ההתאמות שלכם" },
  { icon: Home, title: "בונים את הבית", description: "כשמוצאים את האחד/ת — המסע מתחיל" },
];

const HowItWorks = () => {
  return (
    <section className="py-24 bg-background" dir="rtl">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            איך זה עובד?
          </h2>
          <p className="text-lg text-muted-foreground">ארבעה צעדים פשוטים לחיבור אמיתי</p>
        </motion.div>

        <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="text-center relative"
            >
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 -left-4 w-8 h-[2px] bg-border" />
              )}
              <div className="w-16 h-16 rounded-2xl gradient-hero flex items-center justify-center mx-auto mb-4 shadow-lg">
                <step.icon className="w-7 h-7 text-primary-foreground" />
              </div>
              <div className="text-xs font-bold text-primary mb-2">שלב {i + 1}</div>
              <h3 className="text-base font-semibold text-foreground mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
