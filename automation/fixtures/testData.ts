/** Data-driven search terms: keyword + relevance pattern for result titles. */
export const SEARCH_TERMS: ReadonlyArray<{ keyword: string; expectTitle: RegExp }> = [
  { keyword: 'wireless mouse', expectTitle: /mouse/i },
  { keyword: 'usb c cable', expectTitle: /usb[- ]?c|type[- ]?c/i },
  { keyword: 'mechanical keyboard', expectTitle: /keyboard/i },
];

/** Zero-result query for the negative path. */
export const GIBBERISH_QUERY = 'xzqwv99917akdgh';
