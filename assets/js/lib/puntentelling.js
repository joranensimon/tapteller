/**
 * De regels voor punten en rangschikking. Zuivere functies: geen DOM, geen Firebase.
 * Dit is het hart van de app en wordt daarom volledig getest (tests/unit).
 */

/** Rondt af op `decimalen` om drijvende-kommafouten (0,1 + 0,2) te vermijden. */
export const rond = (waarde, decimalen = 2) => {
  const factor = 10 ** decimalen;
  return Math.round((Number(waarde) || 0) * factor) / factor;
};

/** De drie manieren om te wegen (instelling `modus`). */
export const MODI = ["bonnetjes", "consumptie", "zuipbeker"];

/** Behoort dit item tot de eetbeker? Alles zonder blad "eten" hoort bij de drankbeker. */
export const isEten = (drank) => drank?.blad === "eten";

/**
 * Punten voor `aantal` stuks van een drank (of gerecht).
 * - modus "bonnetjes":   punten = bonnetjes van het item (duurder = zwaarder)
 * - modus "consumptie":  elke consumptie is 1 punt
 * - modus "zuipbeker":   de eigen puntenwaarde van het item (standaard 1)
 * - telt === false: geeft nooit punten
 */
export function puntenVoor(drank, aantal, modus) {
  if (!drank || drank.telt === false) return 0;
  let perStuk;
  if (modus === "zuipbeker") perStuk = drank.punten ?? 1;
  else if (modus === "consumptie") perStuk = 1;
  else perStuk = drank.prijs ?? 0;
  return perStuk * aantal;
}

/**
 * Totaal van een bestelling.
 * Drankpunten gaan naar de drankbeker (`punten`), gerechten naar de eetbeker (`eten`).
 * @param {Record<string, number>} mand  drank-id → aantal
 * @param {Record<string, object>} kaart drank-id → drank
 * @returns {{ bonnetjes: number, punten: number, eten: number }}
 */
export function bestellingTotaal(mand, kaart, modus) {
  let bonnetjes = 0;
  let punten = 0;
  let eten = 0;
  for (const [id, aantal] of Object.entries(mand)) {
    const drank = kaart[id];
    if (!drank || aantal <= 0) continue;
    bonnetjes += (drank.prijs ?? 0) * aantal;
    if (isEten(drank)) eten += puntenVoor(drank, aantal, modus);
    else punten += puntenVoor(drank, aantal, modus);
  }
  return { bonnetjes: rond(bonnetjes), punten: rond(punten), eten: rond(eten) };
}

/**
 * Regels van een bestelling zoals ze bewaard worden (met de prijs en punten van dat moment).
 */
export function bestellingRegels(mand, kaart, modus) {
  const regels = {};
  for (const [id, aantal] of Object.entries(mand)) {
    const drank = kaart[id];
    if (!drank || aantal <= 0) continue;
    regels[id] = {
      naam: drank.naam,
      aantal,
      prijs: drank.prijs ?? 0,
      punten: rond(puntenVoor(drank, aantal, modus)),
      ...(isEten(drank) ? { blad: "eten" } : {}),
    };
  }
  return regels;
}

/**
 * Groepen van hoog naar laag; bij gelijke stand alfabetisch.
 * @param {"aantal" | "eten"} veld  welke beker: drankpunten (`aantal`) of eetpunten (`eten`).
 *                                  `aantal` in het resultaat is steeds de score van die beker.
 */
export function rangschik(groepen, veld = "aantal") {
  return Object.entries(groepen ?? {})
    .map(([id, g]) => ({ id, naam: g.naam || "?", aantal: Number(g[veld]) || 0, foto: g.foto || "" }))
    .sort((a, b) => b.aantal - a.aantal || a.naam.localeCompare(b.naam, "nl"));
}

/** Verhouding (0–100) van een score tegenover de hoogste score, voor de staafgrafiek. */
export function aandeel(aantal, hoogste) {
  if (!hoogste || hoogste <= 0) return 0;
  return Math.max(0, Math.min(100, (aantal / hoogste) * 100));
}
