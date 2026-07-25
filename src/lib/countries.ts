// Compact country list for onboarding (ISO 3166-1 alpha-2). Flag images are
// rendered from the code via flagcdn (deterministic, never AI-generated).
export const COUNTRIES: [code: string, name: string][] = [
  ["PT", "Portugal"], ["ES", "Spain"], ["FR", "France"], ["DE", "Germany"],
  ["GB", "United Kingdom"], ["IE", "Ireland"], ["NL", "Netherlands"], ["BE", "Belgium"],
  ["CH", "Switzerland"], ["AT", "Austria"], ["IT", "Italy"], ["GR", "Greece"],
  ["SE", "Sweden"], ["NO", "Norway"], ["DK", "Denmark"], ["FI", "Finland"],
  ["PL", "Poland"], ["CZ", "Czechia"], ["SK", "Slovakia"], ["HU", "Hungary"],
  ["RO", "Romania"], ["BG", "Bulgaria"], ["HR", "Croatia"], ["RS", "Serbia"],
  ["SI", "Slovenia"], ["EE", "Estonia"], ["LT", "Lithuania"], ["LV", "Latvia"],
  ["UA", "Ukraine"], ["GE", "Georgia"], ["TR", "Turkiye"], ["IL", "Israel"],
  ["AE", "United Arab Emirates"], ["EG", "Egypt"], ["NG", "Nigeria"], ["KE", "Kenya"],
  ["ZA", "South Africa"], ["US", "United States"], ["CA", "Canada"], ["MX", "Mexico"],
  ["BR", "Brazil"], ["AR", "Argentina"], ["CO", "Colombia"], ["CL", "Chile"],
  ["PE", "Peru"], ["IN", "India"], ["CN", "China"], ["HK", "Hong Kong"],
  ["TW", "Taiwan"], ["JP", "Japan"], ["KR", "South Korea"], ["SG", "Singapore"],
  ["MY", "Malaysia"], ["TH", "Thailand"], ["VN", "Vietnam"], ["PH", "Philippines"],
  ["ID", "Indonesia"], ["AU", "Australia"], ["NZ", "New Zealand"],
];

export function flagUrl(code: string, width: 80 | 160 = 80): string {
  return `https://flagcdn.com/w${width}/${code.toLowerCase()}.png`;
}
