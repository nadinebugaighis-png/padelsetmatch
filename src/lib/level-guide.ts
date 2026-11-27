// Practical descriptions for the same 0 to 7 bands used by level-label.ts.
// Keeping the boundaries here lets the guide explain the scale without sending
// players to another app or expecting them to know Playtomic.
export type LevelGuideBand = {
  min: number;
  max: number;
  en: string;
  es: string;
  fr: string;
};

export const LEVEL_GUIDE_BANDS: LevelGuideBand[] = [
  {
    min: 0,
    max: 0.9,
    en: "New to padel. Learning the rules, serving and making steady contact.",
    es: "Empiezas a jugar. Aprendes las reglas, el saque y el contacto con la bola.",
    fr: "Tu découvres le padel. Tu apprends les règles, le service et le contact avec la balle.",
  },
  {
    min: 1,
    max: 1.4,
    en: "You can serve and play a short rally. Rebounds and positioning are still new.",
    es: "Sacas y mantienes un intercambio corto. Aún aprendes los rebotes y la colocación.",
    fr: "Tu sers et échanges quelques balles. Les rebonds et le placement restent nouveaux.",
  },
  {
    min: 1.5,
    max: 2.4,
    en: "Rallies last longer. You are starting to use the glass and move towards the net.",
    es: "Los intercambios duran más. Empiezas a usar el cristal y a subir a la red.",
    fr: "Les échanges durent plus longtemps. Tu commences à utiliser les vitres et à monter au filet.",
  },
  {
    min: 2.5,
    max: 3.4,
    en: "Reliable serves and returns, regular rallies, first bandejas and basic net play.",
    es: "Saques y devoluciones fiables, intercambios regulares, primeras bandejas y juego básico en la red.",
    fr: "Services et retours fiables, échanges réguliers, premières bandejas et jeu de base au filet.",
  },
  {
    min: 3.5,
    max: 4.4,
    en: "Consistent attacking shots, controlled bandejas and confident net positioning.",
    es: "Golpes ofensivos consistentes, bandejas controladas y buena colocación en la red.",
    fr: "Coups offensifs réguliers, bandejas contrôlées et placement assuré au filet.",
  },
  {
    min: 4.5,
    max: 5.4,
    en: "Confident víboras and wall play, tactical movement and a high match tempo.",
    es: "Víboras seguras, buen juego de pared, desplazamientos tácticos y ritmo alto.",
    fr: "Víboras maîtrisées, bon jeu avec les parois, déplacements tactiques et rythme élevé.",
  },
  {
    min: 5.5,
    max: 5.9,
    en: "Tournament consistency, smart shot selection and solid defence under pressure.",
    es: "Regularidad de competición, buena elección de golpe y defensa sólida bajo presión.",
    fr: "Régularité en tournoi, choix de coups judicieux et défense solide sous pression.",
  },
  {
    min: 6,
    max: 7,
    en: "Professional or elite competition level, with complete technical and tactical control.",
    es: "Nivel profesional o de competición élite, con control técnico y táctico completo.",
    fr: "Niveau professionnel ou compétition élite, avec une maîtrise technique et tactique complète.",
  },
];

export function levelGuideRange(band: Pick<LevelGuideBand, "min" | "max">): string {
  return `${band.min.toFixed(1)}–${band.max.toFixed(1)}`;
}
