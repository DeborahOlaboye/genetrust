import React from 'react';
import { useTheme } from '../theme/ThemeProvider.jsx';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const isAlt = theme === 'alt';

  return (
    <button
      onClick={toggleTheme}
      className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all duration-200 
        ${isAlt
          ? 'text-white border-accent-2 bg-accent-2-soft hover:bg-accent-2'
          : 'text-white border-accent-1 bg-accent-1-soft hover:bg-accent-1'}
      `}
      title={`Switch to ${isAlt ? 'Neo' : 'Alt'} theme`}
    >
      {isAlt ? 'Alt' : 'Neo'} Theme
    </button>
  );
};
