import { motion } from "framer-motion";
import { Brain, HeartHandshake, Lock, Users } from "lucide-react";

const values = [
  {
    icon: Brain,
    title: "התאמה מבוססת ערכים",
    description: "לא רק תחביבים — אנחנו מתאימים על בסיס ערכי חיים, חזון משפחתי ואישיות עמוקה.",
  },
  {
    icon: HeartHandshake,
    title: "ליווי אישי",
    description: "כל משתמש מקבל תשומת לב אישית. המערכת אוצרת עבורכם הצעות איכותיות ומדויקות.",
  },
  {
    icon: Lock,
    title: "פרטיות ואמון",
    description: "המידע שלכם נשמר בסודיות מוחלטת. רק התאמות מאושרות רואות את הפרופיל המלא.",
  },
  {
    icon: Users,
    title: "קהילה מגוונת",
    description: "מרקע דתי, מסורתי או חילוני — הבית פתוח לכל מי שמחפש חיבור אמיתי ומשמעותי.",
  },
];

const ValueProps = () => {
  return (
    <section className="py-24 bg-card" dir="rtl">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            למה הבית?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            גישה שונה לשידוכים — מעמיקה, מכבדת ומדויקת
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((value, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="p-6 rounded-xl bg-background shadow-card hover:shadow-card-hover transition-shadow duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <value.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{value.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{value.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ValueProps;
