import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Palette, Database, X, Play, CheckCircle, AlertCircle, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const themes = [
  {
    id: "luxury" as const,
    name: "יוקרתית",
    description: "רקע לבן, טקסט כחול נייבי, מסגרות זהב",
    preview: { bg: "#FFFFFF", text: "#1B2A4A", accent: "#C9A84C" },
  },
  {
    id: "default" as const,
    name: "קלאסית",
    description: "ורוד-אדום חם עם רקע קרם",
    preview: { bg: "#FDFCFB", text: "#1E293B", accent: "#E11D48" },
  },
  {
    id: "warm" as const,
    name: "חמה",
    description: "גוונים חמים וכתומים",
    preview: { bg: "#FFF8F0", text: "#4A2C1A", accent: "#D97706" },
  },
];

const SettingsPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"themes" | "migrations">("themes");
  const { theme, setTheme } = useTheme();
  const { isAdmin } = useAuth();
  const [sqlQuery, setSqlQuery] = useState("");
  const [migrationResult, setMigrationResult] = useState<any>(null);
  const [running, setRunning] = useState(false);

  const runMigration = async () => {
    if (!sqlQuery.trim()) return;
    setRunning(true);
    setMigrationResult(null);
    try {
      const { data, error } = await supabase.rpc("exec_sql", { query: sqlQuery });
      if (error) throw error;
      setMigrationResult(data);
      if ((data as any)?.success) {
        toast.success("המיגרציה הורצה בהצלחה!");
      } else {
        toast.error(`שגיאה: ${(data as any)?.error}`);
      }
    } catch (err: any) {
      toast.error(err.message);
      setMigrationResult({ success: false, error: err.message });
    } finally {
      setRunning(false);
    }
  };

  const runHttpMigration = async () => {
    const url = prompt("הכניסו את כתובת ה-URL של קובץ המיגרציה:");
    if (!url) return;
    setRunning(true);
    try {
      const response = await fetch(url);
      const sql = await response.text();
      setSqlQuery(sql);
      const { data, error } = await supabase.rpc("exec_sql", { query: sql });
      if (error) throw error;
      setMigrationResult(data);
      if ((data as any)?.success) {
        toast.success("מיגרציית HTTP הורצה בהצלחה!");
      } else {
        toast.error(`שגיאה: ${(data as any)?.error}`);
      }
    } catch (err: any) {
      toast.error(err.message);
      setMigrationResult({ success: false, error: err.message });
    } finally {
      setRunning(false);
    }
  };

  const uploadMigrationFile = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".sql,.txt";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const text = await file.text();
      setSqlQuery(text);
      toast.info(`קובץ "${file.name}" נטען בהצלחה`);
    };
    input.click();
  };

  return (
    <>
      {/* Settings button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-50 w-12 h-12 rounded-full bg-card border-2 border-border shadow-elevated flex items-center justify-center text-foreground hover:border-primary hover:text-primary transition-all duration-200"
      >
        <Settings className="w-5 h-5" />
      </button>

      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "-100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-card border-l border-border shadow-elevated overflow-y-auto"
              dir="rtl"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-border">
                <h2 className="text-xl font-bold font-display text-foreground">הגדרות</h2>
                <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-border">
                <button
                  onClick={() => setActiveTab("themes")}
                  className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                    activeTab === "themes" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
                  }`}
                >
                  <Palette className="w-4 h-4" />
                  ערכות נושא
                </button>
                {isAdmin && (
                  <button
                    onClick={() => setActiveTab("migrations")}
                    className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                      activeTab === "migrations" ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
                    }`}
                  >
                    <Database className="w-4 h-4" />
                    מיגרציות
                  </button>
                )}
              </div>

              {/* Content */}
              <div className="p-6">
                {activeTab === "themes" && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground mb-4">בחרו ערכת נושא. הבחירה תישמר גם למפגשים הבאים.</p>
                    {themes.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTheme(t.id)}
                        className={`w-full p-4 rounded-xl border-2 text-right transition-all duration-200 ${
                          theme === t.id
                            ? "border-primary shadow-card-hover"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Color preview */}
                          <div className="flex gap-1">
                            <div className="w-6 h-6 rounded-full border" style={{ background: t.preview.bg }} />
                            <div className="w-6 h-6 rounded-full" style={{ background: t.preview.text }} />
                            <div className="w-6 h-6 rounded-full" style={{ background: t.preview.accent }} />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground">{t.name}</h3>
                            <p className="text-xs text-muted-foreground">{t.description}</p>
                          </div>
                          {theme === t.id && (
                            <CheckCircle className="w-5 h-5 text-primary" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {activeTab === "migrations" && isAdmin && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">הריצו שאילתות SQL ישירות על בסיס הנתונים (אדמין בלבד).</p>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={uploadMigrationFile} className="gap-1.5">
                        <Upload className="w-4 h-4" />
                        העלו קובץ
                      </Button>
                      <Button variant="outline" size="sm" onClick={runHttpMigration} className="gap-1.5">
                        <Database className="w-4 h-4" />
                        מיגרציית HTTP
                      </Button>
                    </div>

                    <textarea
                      value={sqlQuery}
                      onChange={(e) => setSqlQuery(e.target.value)}
                      className="w-full h-48 p-3 rounded-lg border border-input bg-background text-foreground font-mono text-sm focus:ring-2 focus:ring-ring focus:outline-none resize-none"
                      placeholder="-- הכניסו שאילתת SQL כאן..."
                      dir="ltr"
                    />

                    <Button
                      onClick={runMigration}
                      disabled={running || !sqlQuery.trim()}
                      className="w-full gap-2"
                    >
                      <Play className="w-4 h-4" />
                      {running ? "מריץ..." : "הריצו מיגרציה"}
                    </Button>

                    {migrationResult && (
                      <div className={`p-4 rounded-lg border text-sm ${
                        migrationResult.success
                          ? "bg-success/10 border-success/30 text-success"
                          : "bg-destructive/10 border-destructive/30 text-destructive"
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          {migrationResult.success ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : (
                            <AlertCircle className="w-4 h-4" />
                          )}
                          <span className="font-semibold">
                            {migrationResult.success ? "הצלחה" : "שגיאה"}
                          </span>
                        </div>
                        <pre className="text-xs whitespace-pre-wrap" dir="ltr">
                          {JSON.stringify(migrationResult, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default SettingsPanel;
