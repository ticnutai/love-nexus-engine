import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pin, PinOff, Users, Home, ShieldCheck, Settings, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import PeopleTab from "./PeopleTab";

interface AppSidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

const AppSidebar = ({ currentView, onNavigate }: AppSidebarProps) => {
  const [pinned, setPinned] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [activeTab, setActiveTab] = useState<"nav" | "people">("nav");
  const { isAdmin } = useAuth();
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const isOpen = pinned || hovered;

  const handleMouseEnter = useCallback(() => {
    clearTimeout(timeoutRef.current);
    setHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (!pinned) {
      timeoutRef.current = setTimeout(() => setHovered(false), 300);
    }
  }, [pinned]);

  const navItems = [
    { id: "dashboard", label: "דשבורד", icon: Home },
    { id: "people", label: "מידע אנשים", icon: Users },
    ...(isAdmin ? [{ id: "admin", label: "ניהול", icon: ShieldCheck }] : []),
  ];

  return (
    <>
      {/* Hover trigger zone - always visible at right edge */}
      {!isOpen && (
        <div
          className="fixed top-0 right-0 w-3 h-full z-50"
          onMouseEnter={handleMouseEnter}
        />
      )}

      {/* No backdrop - content shifts instead */}

      {/* Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className="fixed top-0 right-0 h-full w-80 z-50 bg-sidebar-background border-l border-sidebar-border shadow-elevated flex flex-col"
            dir="rtl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
              <h2 className="font-display font-bold text-sidebar-foreground text-lg">תפריט</h2>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPinned(!pinned)}
                  title={pinned ? "בטל הצמדה" : "הצמד"}
                  className="text-sidebar-foreground hover:text-sidebar-primary"
                >
                  {pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                </Button>
                {!pinned && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setHovered(false)}
                    className="text-sidebar-foreground hover:text-sidebar-primary"
                  >
                    <ChevronLeft className="w-4 h-4 rotate-180" />
                  </Button>
                )}
              </div>
            </div>

            {/* Tab switcher */}
            <div className="flex border-b border-sidebar-border">
              <button
                onClick={() => setActiveTab("nav")}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === "nav"
                    ? "text-sidebar-primary border-b-2 border-sidebar-primary"
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground"
                }`}
              >
                ניווט
              </button>
              <button
                onClick={() => setActiveTab("people")}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === "people"
                    ? "text-sidebar-primary border-b-2 border-sidebar-primary"
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground"
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  מידע
                </span>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === "nav" ? (
                <nav className="p-3 space-y-1">
                  {navItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => onNavigate(item.id === "people" ? "dashboard" : item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                        currentView === item.id
                          ? "bg-sidebar-accent text-sidebar-primary"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </button>
                  ))}
                </nav>
              ) : (
                <PeopleTab />
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Push content when pinned */}
      {pinned && <div className="w-80 flex-shrink-0" />}
    </>
  );
};

export default AppSidebar;
