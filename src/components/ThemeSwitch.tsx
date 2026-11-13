"use client";

import { useEffect, useState } from "react";
import { IconMoon, IconSun } from "./Icons";

export const THEME_KEY = "finance-tracker-theme";

const isLightNow = () => {
  const attr = document.documentElement.getAttribute("data-theme");
  return attr ? attr === "light" : window.matchMedia("(prefers-color-scheme: light)").matches;
};

/** Follows the system until the user flips it, then remembers the choice (PRD §6.4). */
export function ThemeSwitch() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    setLight(isLightNow());
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => setLight(isLightNow());
    mq.addEventListener?.("change", onChange);
    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_KEY) return;
      if (e.newValue === "light" || e.newValue === "dark") document.documentElement.setAttribute("data-theme", e.newValue);
      else document.documentElement.removeAttribute("data-theme");
      setLight(isLightNow());
    };
    window.addEventListener("storage", onStorage);
    return () => {
      mq.removeEventListener?.("change", onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const toggle = () => {
    const next = isLightNow() ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
    setLight(next === "light");
  };

  return (
    <button type="button" className="theme-switch" role="switch" aria-checked={light} aria-label="Light mode" onClick={toggle}>
      <span className="track">
        <span className="thumb">{light ? <IconSun className="" /> : <IconMoon className="" />}</span>
      </span>
    </button>
  );
}

/** Inline script for <head>: applies the saved theme before first paint. */
export const themeInitScript = `(function(){try{var s=localStorage.getItem(${JSON.stringify(THEME_KEY)});if(s==="light"||s==="dark")document.documentElement.setAttribute("data-theme",s);}catch(e){}})();`;
