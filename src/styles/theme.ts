// src/styles/theme.ts

export const applyTheme = (themeName: string) => {
  let resolvedTheme = themeName;
  if (themeName === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    resolvedTheme = prefersDark ? 'dark-glass' : 'pastel';
  }

  // Remove existing classes
  document.documentElement.classList.remove('theme-pastel', 'theme-dark-glass', 'theme-midnight');
  document.body.classList.remove('theme-pastel', 'theme-dark-glass', 'theme-midnight');

  // Add the resolved class
  if (resolvedTheme === 'dark-glass' || resolvedTheme === 'midnight') {
    document.documentElement.classList.add('theme-dark-glass');
    document.body.classList.add('theme-dark-glass');
  } else {
    document.documentElement.classList.add('theme-pastel');
    document.body.classList.add('theme-pastel');
  }
};
