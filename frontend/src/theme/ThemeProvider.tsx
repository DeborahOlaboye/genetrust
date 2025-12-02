import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const THEME_KEY = 'genetrust-theme';
const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)';

type ThemeMode = 'light' | 'dark' | 'system';

const ThemeContext = createContext({
  theme: 'system' as ThemeMode,
  isDark: false,
  toggleTheme: () => {},
  setTheme: (_: ThemeMode) => {},
});

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return 'system';
    return (localStorage.getItem(THEME_KEY) as ThemeMode) || 'system';
  });

  const isDark = useMemo(() => {
    if (theme === 'system') {
      return window.matchMedia && window.matchMedia(DARK_MEDIA_QUERY).matches;
    }
    return theme === 'dark';
  }, [theme]);

  // Apply theme class to document element
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all theme classes
    root.classList.remove('light-theme', 'dark-theme');
    
    // Add the appropriate theme class
    root.classList.add(isDark ? 'dark-theme' : 'light-theme');
    root.style.colorScheme = isDark ? 'dark' : 'light';
    
    // Save to localStorage
    if (theme !== 'system') {
      localStorage.setItem(THEME_KEY, theme);
    } else {
      localStorage.removeItem(THEME_KEY);
    }
  }, [theme, isDark]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return;
    
    const mediaQuery = window.matchMedia(DARK_MEDIA_QUERY);
    const handleChange = () => {
      document.documentElement.classList.toggle('dark-theme', mediaQuery.matches);
      document.documentElement.style.colorScheme = mediaQuery.matches ? 'dark' : 'light';
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const value = useMemo(() => ({
    theme,
    isDark,
    toggleTheme: () => setTheme(current => 
      current === 'dark' ? 'light' : 'dark'
    ),
    setTheme,
  }), [theme, isDark]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
