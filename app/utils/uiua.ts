import Case from 'case';

const subscriptMap = {
  '0': '₀',
  '1': '₁',
  '2': '₂',
  '3': '₃',
  '4': '₄',
  '5': '₅',
  '6': '₆',
  '7': '₇',
  '8': '₈',
  '9': '₉',
  '-': '₋',
};

export function uiuaifyNameToIdentifier(name: string): string {
  // convert numbers in the end of the name to subscripts
  let identifier = name.replace(/-?(\d+)$/, (match) => {
    return `${numberToSubscript(match)}`;
  });

  // Convert to pascal case
  identifier = Case.pascal(identifier);

  // remove any remaining numbers
  return identifier.replace(/\d/g, '');
}

export function numberToSubscript(num: string): string {
  return num
    .split('')
    .map(digit => subscriptMap[digit as keyof typeof subscriptMap] || digit)
    .join('');
}