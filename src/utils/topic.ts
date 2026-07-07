const TOPIC_ALIASES: Record<string, string> = {
  'passive-voice': 'passive',
  'passive voice': 'passive',
  'relative-clauses': 'relative-clauses',
  'relative clauses': 'relative-clauses',
  'gerunds-infinitives': 'gerunds-infinitives',
  'gerunds infinitives': 'gerunds-infinitives',
};

export function normalizeTopic(topic?: string): string | undefined {
  if (!topic?.trim()) return undefined;
  const key = topic.trim().toLowerCase();
  return TOPIC_ALIASES[key] || key.replace(/\s+/g, '-');
}

export const GRAMMAR_TOPIC_SUGGESTIONS = [
  'tenses',
  'conditionals',
  'articles',
  'modals',
  'passive',
  'relative-clauses',
  'gerunds-infinitives',
  'prepositions',
  'conjunctions',
  'comparisons',
];
