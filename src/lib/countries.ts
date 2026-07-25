// Country list for onboarding (ISO 3166-1 alpha-2), alphabetical by name.
// Flag images render from the code via flagcdn (deterministic, never AI).
// FLAG_COLORS drive the suit trim stripes on the procedural panda.
export const COUNTRIES: [code: string, name: string][] = [
  ["AR", "Argentina"], ["AU", "Australia"], ["AT", "Austria"], ["BE", "Belgium"],
  ["BR", "Brazil"], ["BG", "Bulgaria"], ["CA", "Canada"], ["CL", "Chile"],
  ["CN", "China"], ["CO", "Colombia"], ["HR", "Croatia"], ["CZ", "Czechia"],
  ["DK", "Denmark"], ["EG", "Egypt"], ["EE", "Estonia"], ["FI", "Finland"],
  ["FR", "France"], ["GE", "Georgia"], ["DE", "Germany"], ["GR", "Greece"],
  ["HK", "Hong Kong"], ["HU", "Hungary"], ["IN", "India"], ["ID", "Indonesia"],
  ["IE", "Ireland"], ["IL", "Israel"], ["IT", "Italy"], ["JP", "Japan"],
  ["KE", "Kenya"], ["LV", "Latvia"], ["LT", "Lithuania"], ["MY", "Malaysia"],
  ["MX", "Mexico"], ["NL", "Netherlands"], ["NZ", "New Zealand"], ["NG", "Nigeria"],
  ["NO", "Norway"], ["PE", "Peru"], ["PH", "Philippines"], ["PL", "Poland"],
  ["PT", "Portugal"], ["RO", "Romania"], ["RS", "Serbia"], ["SG", "Singapore"],
  ["SK", "Slovakia"], ["SI", "Slovenia"], ["ZA", "South Africa"], ["KR", "South Korea"],
  ["ES", "Spain"], ["SE", "Sweden"], ["CH", "Switzerland"], ["TW", "Taiwan"],
  ["TH", "Thailand"], ["TR", "Turkiye"], ["UA", "Ukraine"], ["AE", "United Arab Emirates"],
  ["GB", "United Kingdom"], ["US", "United States"], ["VN", "Vietnam"],
];

export function flagUrl(code: string, width: 80 | 160 = 80): string {
  return `https://flagcdn.com/w${width}/${code.toLowerCase()}.png`;
}

// Two signature flag colors per country, used as suit-trim stripes.
export const FLAG_COLORS: Record<string, [string, string]> = {
  AR: ["#74ACDF", "#F6B40E"], AU: ["#012169", "#E4002B"], AT: ["#ED2939", "#FFFFFF"],
  BE: ["#FDDA24", "#EF3340"], BR: ["#009C3B", "#FFDF00"], BG: ["#00966E", "#D62612"],
  CA: ["#FF0000", "#FFFFFF"], CL: ["#D52B1E", "#0039A6"], CN: ["#DE2910", "#FFDE00"],
  CO: ["#FCD116", "#003893"], HR: ["#FF0000", "#171796"], CZ: ["#11457E", "#D7141A"],
  DK: ["#C8102E", "#FFFFFF"], EG: ["#CE1126", "#000000"], EE: ["#0072CE", "#000000"],
  FI: ["#002F6C", "#FFFFFF"], FR: ["#0055A4", "#EF4135"], GE: ["#FF0000", "#FFFFFF"],
  DE: ["#DD0000", "#FFCE00"], GR: ["#0D5EAF", "#FFFFFF"], HK: ["#DE2910", "#FFFFFF"],
  HU: ["#CE2939", "#477050"], IN: ["#FF9933", "#138808"], ID: ["#FF0000", "#FFFFFF"],
  IE: ["#169B62", "#FF883E"], IL: ["#0038B8", "#FFFFFF"], IT: ["#008C45", "#CD212A"],
  JP: ["#BC002D", "#FFFFFF"], KE: ["#006600", "#BB0000"], LV: ["#9E3039", "#FFFFFF"],
  LT: ["#FDB913", "#006A44"], MY: ["#010066", "#CC0001"], MX: ["#006847", "#CE1126"],
  NL: ["#AE1C28", "#21468B"], NZ: ["#012169", "#C8102E"], NG: ["#008751", "#FFFFFF"],
  NO: ["#BA0C2F", "#00205B"], PE: ["#D91023", "#FFFFFF"], PH: ["#0038A8", "#CE1126"],
  PL: ["#DC143C", "#FFFFFF"], PT: ["#046A38", "#DA291C"], RO: ["#002B7F", "#FCD116"],
  RS: ["#C6363C", "#0C4076"], SG: ["#EF3340", "#FFFFFF"], SK: ["#0B4EA2", "#EE1C25"],
  SI: ["#005DA4", "#ED1C24"], ZA: ["#007A4D", "#FFB612"], KR: ["#003478", "#C60C30"],
  ES: ["#AA151B", "#F1BF00"], SE: ["#006AA7", "#FECC02"], CH: ["#DA291C", "#FFFFFF"],
  TW: ["#FE0000", "#000095"], TH: ["#A51931", "#2D2A4A"], TR: ["#E30A17", "#FFFFFF"],
  UA: ["#005BBB", "#FFD500"], AE: ["#00732F", "#FF0000"], GB: ["#012169", "#C8102E"],
  US: ["#B22234", "#3C3B6E"], VN: ["#DA251D", "#FFFF00"],
};
