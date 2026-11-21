/**
 * Indeling van de ranglijst op de beamer: hoeveel rijen en kolommen, hoeveel pagina's,
 * en in welke volgorde de "dia's" (beker × pagina) doorlopen worden. Zuivere functies.
 */

const MAX_RIJEN_ALLES = 12;
const MAX_KOLOMMEN_ALLES = 4;
const MIN_RIJEN = 4;

/**
 * @param {{ totaal: number, perPagina: number, alles?: boolean }} opties
 *   perPagina 0 of alles = true: alle groepen tegelijk, in meerdere kolommen als het er veel zijn.
 * @returns {{ kolommen: number, rijen: number, perBlad: number, paginas: number }}
 */
export function indeling({ totaal, perPagina, alles = false }) {
  const aantal = Math.max(0, Math.floor(totaal) || 0);

  if (alles || !perPagina) {
    const kolommen = Math.min(MAX_KOLOMMEN_ALLES, Math.max(1, Math.ceil(aantal / MAX_RIJEN_ALLES)));
    const rijen = Math.max(1, Math.ceil(aantal / kolommen));
    return { kolommen, rijen, perBlad: kolommen * rijen, paginas: 1 };
  }

  const rijen = Math.max(Math.min(perPagina, aantal), Math.min(perPagina, MIN_RIJEN)) || 1;
  return { kolommen: 1, rijen, perBlad: rijen, paginas: Math.max(1, Math.ceil(aantal / rijen)) };
}

/** Alle dia's: eerst alle pagina's van de eerste beker, dan van de volgende. */
export function maakDias(bekers, paginas) {
  return bekers.flatMap((beker) => Array.from({ length: paginas }, (_, pagina) => ({ beker, pagina })));
}

/** Volgende en vorige dia, met doorlopen aan het einde. */
export const volgende = (index, lengte) => (lengte ? (index + 1) % lengte : 0);
export const vorige = (index, lengte) => (lengte ? (index - 1 + lengte) % lengte : 0);

/** "plaats 11–20 van 34" voor de statusregel. */
export function plaatsBereik(pagina, { perBlad }, totaal) {
  const van = pagina * perBlad + 1;
  const tot = Math.min(totaal, (pagina + 1) * perBlad);
  return van === tot ? `plaats ${van} van ${totaal}` : `plaats ${van}–${tot} van ${totaal}`;
}
