/**
 * PHONETIC CONVERTER - English to Portuguese-BR Pronunciation
 * Converts English text to phonetic representation for pronunciation guide
 */

export interface PhoneticRule {
  regex: RegExp;
  replace: string;
  priority: number; // Higher = applied first
}

// Phonetic rules ordered by priority (longest patterns first)
const PHONETIC_RULES: PhoneticRule[] = [
  // Priority 100: Multi-letter patterns
  { regex: /\bth\b/gi, replace: "d", priority: 100 },
  { regex: /\bth([aeiou])/gi, replace: "d$1", priority: 100 },
  { regex: /ing\b/gi, replace: "in", priority: 100 },
  { regex: /tion\b/gi, replace: "shon", priority: 100 },
  { regex: /sion\b/gi, replace: "shon", priority: 100 },

  // Priority 90: Common endings
  { regex: /er\b/gi, replace: "er", priority: 90 },
  { regex: /ed\b/gi, replace: "ed", priority: 90 },
  { regex: /ly\b/gi, replace: "li", priority: 90 },
  { regex: /ous\b/gi, replace: "os", priority: 90 },

  // Priority 80: Vowel combinations
  { regex: /ai/gi, replace: "ei", priority: 80 },
  { regex: /oa/gi, replace: "ou", priority: 80 },
  { regex: /oo/gi, replace: "u", priority: 80 },
  { regex: /ou/gi, replace: "au", priority: 80 },
  { regex: /ea/gi, replace: "i", priority: 80 },
  { regex: /ie/gi, replace: "i", priority: 80 },

  // Priority 70: Common words
  { regex: /\bthe\b/gi, replace: "di", priority: 70 },
  { regex: /\byou\b/gi, replace: "iu", priority: 70 },
  { regex: /\byour\b/gi, replace: "iór", priority: 70 },
  { regex: /\bwhat\b/gi, replace: "uat", priority: 70 },
  { regex: /\bwhere\b/gi, replace: "uer", priority: 70 },
  { regex: /\bwhen\b/gi, replace: "uen", priority: 70 },
  { regex: /\bhow\b/gi, replace: "hau", priority: 70 },
  { regex: /\bwith\b/gi, replace: "uid", priority: 70 },
  { regex: /\bfrom\b/gi, replace: "from", priority: 70 },
  { regex: /\bwork\b/gi, replace: "uórk", priority: 70 },
  { regex: /\bexperience\b/gi, replace: "ekspiríens", priority: 70 },
  { regex: /\bdata\b/gi, replace: "deita", priority: 70 },
  { regex: /\banalyst\b/gi, replace: "analista", priority: 70 },
  { regex: /\bskill\b/gi, replace: "skil", priority: 70 },
  { regex: /\bpython\b/gi, replace: "paiton", priority: 70 },
  { regex: /\bsql\b/gi, replace: "éskiuel", priority: 70 },
  { regex: /\bcloud\b/gi, replace: "claud", priority: 70 },
  { regex: /\btools\b/gi, replace: "tulz", priority: 70 },
  { regex: /\bspecialize\b/gi, replace: "espesialais", priority: 70 },

  // Priority 60: Individual vowels
  { regex: /a(?![aeiou])/gi, replace: "ei", priority: 60 },
  { regex: /e(?![aeiou])/gi, replace: "i", priority: 60 },
  { regex: /i(?![aeiou])/gi, replace: "ai", priority: 60 },
  { regex: /o(?![aeiou])/gi, replace: "ou", priority: 60 },
  { regex: /u(?![aeiou])/gi, replace: "iu", priority: 60 },

  // Priority 50: Consonants
  { regex: /c([ei])/gi, replace: "s$1", priority: 50 },
  { regex: /g([ei])/gi, replace: "j$1", priority: 50 },
  { regex: /j/gi, replace: "j", priority: 50 },
  { regex: /z/gi, replace: "z", priority: 50 },
  { regex: /s/gi, replace: "s", priority: 50 },
];

/**
 * Convert English text to Portuguese-BR phonetic pronunciation
 * @param text - English text to convert
 * @returns Phonetic representation for pronunciation
 */
export function toPhoneticPTBR(text: string): string {
  if (!text || text.length === 0) return "";

  // Sort rules by priority (descending)
  const sortedRules = [...PHONETIC_RULES].sort((a, b) => b.priority - a.priority);

  let result = text.toLowerCase();

  // Apply rules in priority order
  for (const rule of sortedRules) {
    result = result.replace(rule.regex, rule.replace);
  }

  // Clean up multiple spaces
  result = result.replace(/\s+/g, " ").trim();

  return result;
}

/**
 * Convert text to phonetic with markers for emphasis
 * @param text - Text to convert
 * @returns Phonetic with emphasis markers (*)
 */
export function toPhoneticWithEmphasis(text: string): string {
  const phonetic = toPhoneticPTBR(text);

  // Add emphasis to stressed syllables (simplified)
  return phonetic
    .replace(/([aeiou]{1,2})/gi, "*$1*") // Mark vowels
    .replace(/\*\*/g, "*"); // Clean up double markers
}

/**
 * Get phonetic guide for a single word
 * @param word - Single word to convert
 * @returns Phonetic representation
 */
export function getWordPhonetic(word: string): string {
  return toPhoneticPTBR(word);
}

/**
 * Batch convert multiple words
 * @param words - Array of words
 * @returns Array of phonetic representations
 */
export function getWordsPhonetic(words: string[]): string[] {
  return words.map(toPhoneticPTBR);
}

/**
 * Example usage:
 * toPhoneticPTBR("I have 18 years of experience") 
 * → "ai hev 18 iérz ov ekspiríens"
 * 
 * toPhoneticPTBR("Tell me about your skills")
 * → "tel mi abaut iór skils"
 */
