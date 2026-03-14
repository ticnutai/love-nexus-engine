import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export const THEMES = [
  { id: "luxury", label: "יוקרתי", emoji: "✨" },
  { id: "default", label: "קלאסי", emoji: "🏠" },
  { id: "warm", label: "חמים", emoji: "🌅" },
  { id: "ocean", label: "אוקיינוס", emoji: "🌊" },
  { id: "forest", label: "יער", emoji: "🌲" },
  { id: "midnight", label: "חצות", emoji: "🌙" },
  { id: "rose", label: "ורדים", emoji: "🌹" },
] as const;

export type ThemeName = (typeof THEMES)[number]["id"];

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
  const [theme, setThemeState] = useState<ThemeName>(() => {
    return (localStorage.getItem("zhutoton-theme") as ThemeName) || "luxury";
  });

  useEffect(() => {
    const root = document.documentElement;
    THEMES.forEach((t) => root.classList.remove(`theme-${t.id}`));
    root.classList.add(`theme-${theme}`);
  }, [theme]);

  const setTheme = (newTheme: ThemeName) => {
    setThemeState(newTheme);
    localStorage.setItem("zhutoton-theme", newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
