import { motion } from "framer-motion";
import { Heart, Bell, User, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import MatchCard from "./MatchCard";

const mockMatches = [
  {
    name: "שרה",
    age: 27,
    city: "ירושלים",
    occupation: "מעצבת גרפית",
    compatibility: 94,
    values: ["משפחה", "יצירתיות", "מסורת"],
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face",
  },
  {
    name: "יעל",
    age: 25,
    city: "תל אביב",
    occupation: "עורכת דין",
    compatibility: 91,
    values: ["צדק", "אמביציה", "חום"],
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face",
  },
  {
    name: "נועה",
    age: 29,
    city: "חיפה",
    occupation: "רופאה",
    compatibility: 88,
    values: ["עזרה לזולת", "משפחה", "למידה"],
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face",
  },
  {
    name: "מיכל",
    age: 26,
    city: "רעננה",
    occupation: "מורה",
    compatibility: 85,
    values: ["חינוך", "סבלנות", "אמונה"],
    avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop&crop=face",
  },
  {
    name: "רחל",
    age: 28,
    city: "הרצליה",
    occupation: "מהנדסת תוכנה",
    compatibility: 82,
    values: ["חדשנות", "משפחה", "הרפתקאות"],
    avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&h=200&fit=crop&crop=face",
  },
  {
    name: "תמר",
    age: 24,
    city: "באר שבע",
    occupation: "פסיכולוגית",
    compatibility: 79,
    values: ["הקשבה", "עומק", "חמלה"],
    avatar: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=200&h=200&fit=crop&crop=face",
  },
];

interface DashboardProps {
  onLogout: () => void;
  onAdminPanel?: () => void;
}

const Dashboard = ({ onLogout, onAdminPanel }: DashboardProps) => {
  const { isAdmin } = useAuth();
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <Heart className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold font-display text-foreground">הבית</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Bell className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <User className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onLogout}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container py-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-foreground mb-2">ההתאמות שלכם</h1>
          <p className="text-muted-foreground">
            מצאנו {mockMatches.length} התאמות איכותיות עבורכם. קחו את הזמן 💝
          </p>
        </motion.div>

        {/* Match grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockMatches.map((match, i) => (
            <MatchCard
              key={i}
              {...match}
              index={i}
              onViewProfile={() => {}}
            />
          ))}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
