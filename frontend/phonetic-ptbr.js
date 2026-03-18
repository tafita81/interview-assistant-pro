// Convert English text to PT-BR phonetic reading helper

const map = [
  { regex: /th/g, replace: "d" },
  { regex: /ing\b/g, replace: "in" },
  { regex: /er\b/g, replace: "er" },
  { regex: /a\b/g, replace: "ei" },
  { regex: /i\b/g, replace: "ai" },
  { regex: /e\b/g, replace: "i" },
  { regex: /o\b/g, replace: "ou" },
  { regex: /u\b/g, replace: "iu" },
  { regex: /save/gi, replace: "seiv" },
  { regex: /data/gi, replace: "deita" },
  { regex: /make/gi, replace: "meik" },
  { regex: /use/gi, replace: "iuz" }
];

export function toPhoneticPTBR(text){
  let result = text;

  map.forEach(rule => {
    result = result.replace(rule.regex, rule.replace);
  });

  return result;
}
