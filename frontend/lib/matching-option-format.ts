const MATCHING_OPTION_PREFIX_RE = /^([a-z0-9ivxlcdm]+)[.)]\s*(.*)$/i;

export type MatchingOptionViewModel = {
  raw: string;
  value: string;
  prefix: string;
  text: string;
  label: string;
  hasExplicitPrefix: boolean;
  fixedParagraphLabel: string | null;
};

function alphabetLabelFromIndex(index: number) {
  let current = index;
  let label = "";

  do {
    label = String.fromCharCode(65 + (current % 26)) + label;
    current = Math.floor(current / 26) - 1;
  } while (current >= 0);

  return label;
}

function normalizePrefix(prefix: string) {
  return prefix.trim().toUpperCase();
}

function romanNumeralFromIndex(index: number) {
  const numerals: Array<[number, string]> = [
    [1000, "m"],
    [900, "cm"],
    [500, "d"],
    [400, "cd"],
    [100, "c"],
    [90, "xc"],
    [50, "l"],
    [40, "xl"],
    [10, "x"],
    [9, "ix"],
    [5, "v"],
    [4, "iv"],
    [1, "i"],
  ];

  let value = index + 1;
  let result = "";
  for (const [amount, glyph] of numerals) {
    while (value >= amount) {
      result += glyph;
      value -= amount;
    }
  }
  return result;
}

export function shouldAutoLetterMatchingOptions(typeId: string) {
  return typeId.includes("matching_features");
}

export function shouldAutoRomanMatchingOptions(typeId: string) {
  return typeId.includes("matching_headings");
}

export function getMatchingOptionViewModel(
  option: string,
  index: number,
  typeId: string
): MatchingOptionViewModel {
  const trimmed = option.trim();
  const fixedExampleMatch = trimmed.match(/^([A-Z]+)\s*->\s*(.+)$/i);
  const fixedParagraphLabel = fixedExampleMatch ? normalizePrefix(fixedExampleMatch[1]) : null;
  const optionBody = fixedExampleMatch ? fixedExampleMatch[2].trim() : trimmed;
  const explicitMatch = optionBody.match(MATCHING_OPTION_PREFIX_RE);
  const shouldAutoLetter = shouldAutoLetterMatchingOptions(typeId);
  const shouldAutoRoman = shouldAutoRomanMatchingOptions(typeId);

  if (explicitMatch) {
    const prefix = normalizePrefix(explicitMatch[1]);
    const text = explicitMatch[2].trim();
    return {
      raw: option,
      value: prefix,
      prefix,
      text,
      label: text ? `${prefix}. ${text}` : prefix,
      hasExplicitPrefix: true,
      fixedParagraphLabel,
    };
  }

  if (shouldAutoLetter) {
    const prefix = alphabetLabelFromIndex(index);
    return {
      raw: option,
      value: prefix,
      prefix,
      text: optionBody,
      label: optionBody ? `${prefix}. ${optionBody}` : prefix,
      hasExplicitPrefix: false,
      fixedParagraphLabel,
    };
  }

  if (shouldAutoRoman) {
    const prefix = romanNumeralFromIndex(index);
    return {
      raw: option,
      value: prefix,
      prefix,
      text: optionBody,
      label: optionBody,
      hasExplicitPrefix: false,
      fixedParagraphLabel,
    };
  }

  return {
    raw: option,
    value: optionBody,
    prefix: optionBody,
    text: optionBody,
    label: optionBody,
    hasExplicitPrefix: false,
    fixedParagraphLabel,
  };
}

function normalizeComparableValue(value: string) {
  return value.trim().toUpperCase();
}

export function normalizeMatchingAnswerValue(
  answer: string,
  options: string[],
  typeId: string
) {
  const trimmed = answer.trim();
  if (!trimmed) {
    return "";
  }

  const normalizedAnswer = normalizeComparableValue(trimmed);
  const matched = options
    .map((option, index) => getMatchingOptionViewModel(option, index, typeId))
    .find((option) => {
      const candidates = [
        option.value,
        option.prefix,
        option.text,
        option.label,
        option.raw,
      ];
      return candidates.some((candidate) => normalizeComparableValue(candidate) === normalizedAnswer);
    });

  return matched?.value ?? ((shouldAutoLetterMatchingOptions(typeId) || shouldAutoRomanMatchingOptions(typeId)) ? normalizedAnswer : trimmed);
}

export function formatMatchingAnswerForReview(
  answer: string | null | undefined,
  options: string[],
  typeId: string
) {
  if (!answer) {
    return "No answer";
  }

  const trimmed = answer.trim();
  if (!trimmed) {
    return "No answer";
  }

  const normalizedValue = normalizeMatchingAnswerValue(trimmed, options, typeId);
  const matched = options
    .map((option, index) => getMatchingOptionViewModel(option, index, typeId))
    .find((option) => option.value === normalizedValue);

  if (matched) {
    return matched.label;
  }

  return (shouldAutoLetterMatchingOptions(typeId) || shouldAutoRomanMatchingOptions(typeId)) ? normalizedValue : trimmed;
}
