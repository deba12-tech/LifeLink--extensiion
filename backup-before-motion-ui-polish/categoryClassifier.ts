// src/lib/categoryClassifier.ts

export interface CategoryRule {
  id: string;
  domain: string;
  category: string;
}

export const DEFAULT_RULES: CategoryRule[] = [
  { id: '1', domain: 'github.com', category: 'Deep Work' },
  { id: '2', domain: 'youtube.com', category: 'Learning' }
];

export const classifyCategory = (domain: string, rules: CategoryRule[] = DEFAULT_RULES): string => {
  const cleanDomain = domain.toLowerCase().replace('www.', '').trim();
  
  // Check user custom rules
  const match = rules.find((r) => {
    const cleanRuleDomain = r.domain.toLowerCase().trim();
    return cleanDomain === cleanRuleDomain || cleanDomain.endsWith('.' + cleanRuleDomain);
  });
  
  if (match) {
    return match.category;
  }
  
  // Default rules mapping
  if (
    cleanDomain.includes('github.com') ||
    cleanDomain.includes('gitlab.com') ||
    cleanDomain.includes('stackoverflow.com') ||
    cleanDomain.includes('localhost') ||
    cleanDomain.endsWith('.local') ||
    cleanDomain.includes('vscode')
  ) {
    return 'Deep Work';
  }

  if (
    cleanDomain.includes('youtube.com') ||
    cleanDomain.includes('wikipedia.org') ||
    cleanDomain.includes('medium.com') ||
    cleanDomain.includes('docs.google.com') ||
    cleanDomain.includes('developer.chrome.com') ||
    cleanDomain.includes('w3schools.com') ||
    cleanDomain.includes('stackoverflow') ||
    cleanDomain.includes('npm') ||
    cleanDomain.includes('vite') ||
    cleanDomain.includes('typescript')
  ) {
    return 'Learning';
  }

  return 'Casual';
};
