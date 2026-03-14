import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

type ThemeName = "luxury" | "default" | "warm";

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "luxury",
  setTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<ThemeName>(() => {
    return (localStorage.getItem("habayit-theme") as ThemeName) || "luxury";
  });

  // Load theme from DB when user logs in
  useEffect(() => {
    if (!user) return;
    const loadTheme = async () => {
      const { data } = await supabase
        .from("user_settings")
        .select("theme")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.theme) {
        setThemeState(data.theme as ThemeName);
        localStorage.setItem("habayit-theme", data.theme);
      }
    };
    loadTheme();
  }, [user]);

  // Apply theme class to root
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("theme-luxury", "theme-default", "theme-warm");
    root.classList.add(`theme-${theme}`);
  }, [theme]);

  const setTheme = async (newTheme: ThemeName) => {
    setThemeState(newTheme);
    localStorage.setItem("habayit-theme", newTheme);
    if (user) {
      await supabase
        .from("user_settings")
        .update({ theme: newTheme })
        .eq("user_id", user.id);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
