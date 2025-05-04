import { useState, useEffect } from "react";
import { isTauri } from "../utils/environment";

export function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const loadTheme = async () => {
      if (isTauri()) {
        const { invoke } = await import("@tauri-apps/api/core");
        try {
          const savedTheme = await invoke<string>("get_theme");
          setTheme(savedTheme as "light" | "dark");
          document.documentElement.classList.toggle(
            "dark",
            savedTheme === "dark"
          );
        } catch {
          setTheme("light");
        }
      } else {
        const savedTheme = localStorage.getItem("theme") || "light";
        setTheme(savedTheme as "light" | "dark");
        document.documentElement.classList.toggle(
          "dark",
          savedTheme === "dark"
        );
      }
    };
    loadTheme();
  }, []);

  const toggleTheme = async () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    if (isTauri()) {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("set_theme", { theme: newTheme });
    } else {
      localStorage.setItem("theme", newTheme);
    }
  };

  return { theme, toggleTheme };
}
