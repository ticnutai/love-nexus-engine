import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Apply saved theme on load (before React renders to prevent flash)
const savedTheme = localStorage.getItem("habayit-theme") || "luxury";
document.documentElement.classList.add(`theme-${savedTheme}`);

createRoot(document.getElementById("root")!).render(<App />);
