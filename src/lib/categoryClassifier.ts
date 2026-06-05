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

export const classifyCategory = (
  domain: string,
  rules: CategoryRule[] = DEFAULT_RULES,
  title: string = '',
  url: string = ''
): string => {
  const cleanDomain = domain.toLowerCase().replace('www.', '').trim();
  const cleanUrl = url.toLowerCase().trim();
  const cleanTitle = title.toLowerCase().trim();
  
  // Check user custom rules first
  const match = rules.find((r) => {
    const cleanRuleDomain = r.domain.toLowerCase().trim();
    return cleanDomain === cleanRuleDomain || cleanDomain.endsWith('.' + cleanRuleDomain);
  });
  
  if (match) {
    return match.category;
  }
  
  // 1. YouTube educational check
  if (cleanDomain.includes('youtube.com') || cleanDomain.includes('youtu.be')) {
    const isEducational = 
      cleanUrl.includes('education') || 
      cleanUrl.includes('course') || 
      cleanUrl.includes('tutorial') ||
      cleanTitle.includes('tutorial') ||
      cleanTitle.includes('course') ||
      cleanTitle.includes('learn') ||
      cleanTitle.includes('how to') ||
      cleanTitle.includes('programming') ||
      cleanTitle.includes('science') ||
      cleanTitle.includes('math') ||
      cleanTitle.includes('lecture') ||
      cleanTitle.includes('coding') ||
      cleanTitle.includes('developer') ||
      cleanTitle.includes('academic') ||
      cleanTitle.includes('explain') ||
      cleanTitle.includes('history');
      
    if (isEducational) {
      return 'Learning';
    }
    return 'Casual';
  }

  // 2. Deep Work (GitHub, StackOverflow, localhost)
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

  // 3. Learning (Wikipedia, medium, docs, etc.)
  if (
    cleanDomain.includes('wikipedia.org') ||
    cleanDomain.includes('medium.com') ||
    cleanDomain.includes('docs.google.com') ||
    cleanDomain.includes('developer.chrome.com') ||
    cleanDomain.includes('w3schools.com') ||
    cleanDomain.includes('npm') ||
    cleanDomain.includes('vite') ||
    cleanDomain.includes('typescript') ||
    cleanDomain.includes('reactjs') ||
    cleanDomain.includes('mozilla.org')
  ) {
    return 'Learning';
  }

  // 4. LinkedIn -> Work / Career
  if (cleanDomain.includes('linkedin.com')) {
    return 'Work / Career';
  }

  // 5. ChatGPT -> Productivity
  if (
    cleanDomain.includes('chatgpt.com') ||
    cleanDomain.includes('chat.openai.com') ||
    cleanDomain.includes('claude.ai') ||
    cleanDomain.includes('gemini.google.com')
  ) {
    return 'Productivity';
  }

  // 6. Instagram/Facebook/X -> Social
  if (
    cleanDomain.includes('instagram.com') ||
    cleanDomain.includes('facebook.com') ||
    cleanDomain.includes('x.com') ||
    cleanDomain.includes('twitter.com') ||
    cleanDomain.includes('reddit.com') ||
    cleanDomain.includes('tiktok.com')
  ) {
    return 'Social';
  }

  // 7. Shopping sites -> Shopping
  if (
    cleanDomain.includes('amazon.com') ||
    cleanDomain.includes('amazon.in') ||
    cleanDomain.includes('amazon.co') ||
    cleanDomain.includes('ebay.com') ||
    cleanDomain.includes('etsy.com') ||
    cleanDomain.includes('shopping') ||
    cleanDomain.includes('shopify.com') ||
    cleanDomain.includes('aliexpress') ||
    cleanDomain.includes('walmart.com') ||
    cleanDomain.includes('target.com')
  ) {
    return 'Shopping';
  }

  return 'Casual';
};
