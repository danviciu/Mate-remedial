/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { getUiAnimationsEnabled, setUiAnimationsEnabled } from "../lib/motion.js";

const SETTINGS_KEY = "mateReset.appSettings";

const AppSettingsContext = createContext(null);

function readSettings() {
  if (typeof window === "undefined") {
    return {
      animations: true,
      sounds: true,
      studentName: "",
    };
  }

  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      return {
        animations: getUiAnimationsEnabled(),
        sounds: true,
        studentName: "",
      };
    }
    const parsed = JSON.parse(raw);
    return {
      animations:
        typeof parsed.animations === "boolean"
          ? parsed.animations
          : getUiAnimationsEnabled(),
      sounds: typeof parsed.sounds === "boolean" ? parsed.sounds : true,
      studentName: typeof parsed.studentName === "string" ? parsed.studentName : "",
    };
  } catch {
    return {
      animations: getUiAnimationsEnabled(),
      sounds: true,
      studentName: "",
    };
  }
}

function writeSettings(settings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function AppSettingsProvider({ children }) {
  const prefersReducedMotion = useReducedMotion() ?? false;
  const [settings, setSettings] = useState(() => readSettings());

  useEffect(() => {
    writeSettings(settings);
  }, [settings]);

  useEffect(() => {
    setUiAnimationsEnabled(settings.animations);
  }, [settings.animations]);

  const value = useMemo(() => {
    const setAnimations = (animations) =>
      setSettings((prev) => ({ ...prev, animations: Boolean(animations) }));
    const setSounds = (sounds) =>
      setSettings((prev) => ({ ...prev, sounds: Boolean(sounds) }));
    const setStudentName = (studentName) =>
      setSettings((prev) => ({ ...prev, studentName: String(studentName ?? "") }));

    return {
      settings,
      setAnimations,
      setSounds,
      setStudentName,
      prefersReducedMotion,
      shouldReduceMotion: prefersReducedMotion || !settings.animations,
    };
  }, [prefersReducedMotion, settings]);

  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error("useSettings must be used inside AppSettingsProvider.");
  }
  return context;
}
