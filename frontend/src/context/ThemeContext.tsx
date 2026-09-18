import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark';
export type CurtainPhase = 'idle' | 'falling' | 'rising';

interface ThemeContextType {
  theme: Theme;
  phase: CurtainPhase;
  duration: number;
  toggleTheme: () => void;
  setThemeDirect: (newTheme: Theme) => void;
}

const THEME_COLORS: Record<Theme, string> = {
  dark: '#151219',
  light: '#faf7fc',
};

const CURTAIN_EASING = 'cubic-bezier(0.76, 0, 0.24, 1)';
const DEFAULT_DURATION = 550;

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('noble_theme') as Theme | null;
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
      if (window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
      }
    }
    return 'dark';
  });

  const [phase, setPhase] = useState<CurtainPhase>('idle');
  const [curtainBg, setCurtainBg] = useState<string>(THEME_COLORS[theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    root.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    if (phase !== 'idle') return;

    const nextTheme: Theme = theme === 'light' ? 'dark' : 'light';
    setCurtainBg(THEME_COLORS[nextTheme]);

    setPhase('falling');

    setTimeout(() => {
      setThemeState(nextTheme);
      const root = document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(nextTheme);
      root.setAttribute('data-theme', nextTheme);
      localStorage.setItem('noble_theme', nextTheme);

      setPhase('rising');

      setTimeout(() => {
        setPhase('idle');
      }, DEFAULT_DURATION + 60);
    }, DEFAULT_DURATION);
  }, [theme, phase]);

  const setThemeDirect = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    setCurtainBg(THEME_COLORS[newTheme]);
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(newTheme);
    root.setAttribute('data-theme', newTheme);
    localStorage.setItem('noble_theme', newTheme);
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        phase,
        duration: DEFAULT_DURATION,
        toggleTheme,
        setThemeDirect,
      }}
    >
      {/* Cortina */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: curtainBg,
          transformOrigin: 'top',
          transform: phase === 'falling' ? 'scaleY(1)' : 'scaleY(0)',
          transition: phase !== 'idle' ? `transform ${DEFAULT_DURATION}ms ${CURTAIN_EASING}` : 'none',
          zIndex: 99999,
          pointerEvents: 'none',
          boxShadow: phase === 'falling' ? '0 15px 40px rgba(140, 86, 212, 0.45)' : 'none',
        }}
      />
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
