/** Afgeleide gegevens uit de state. Tabbladen gebruiken enkel deze functies om te lezen. */
import { APP } from "../config.js";
import { state } from "./state.js";

export const modus = () => state.instellingen.modus || "bonnetjes";
export const isZuipbeker = () => modus() === "zuipbeker";

export function woorden() {
  return APP.woorden[state.instellingen.woord] ?? APP.woorden.groep;
}

export const groepen = () =>
  Object.entries(state.groepen)
    .map(([id, groep]) => ({ id, ...groep }))
    .sort((a, b) => (a.t || 0) - (b.t || 0));

export const dranken = () =>
  Object.entries(state.kaart)
    .map(([id, drank]) => ({ id, ...drank }))
    .sort((a, b) => (a.v ?? 0) - (b.v ?? 0) || String(a.naam).localeCompare(b.naam, "nl"));

export const BLADEN = [
  { id: "dranken", label: "Dranken" },
  { id: "eten", label: "Eten" },
];
export const bladVan = (drank) => (drank.blad === "eten" ? "eten" : "dranken");

export const bestellingen = () =>
  Object.entries(state.bestellingen)
    .map(([id, bestelling]) => ({ id, ...bestelling }))
    .sort((a, b) => b.t - a.t);

export const geldigeBestellingen = () => bestellingen().filter((b) => !b.geannuleerd);

/** Verkochte aantallen per drank, meest verkocht eerst: [[naam, aantal], …]. */
export function verkoopPerDrank(lijst = geldigeBestellingen()) {
  const totalen = new Map();
  for (const b of lijst) {
    for (const regel of Object.values(b.items ?? {})) totalen.set(regel.naam, (totalen.get(regel.naam) || 0) + (regel.aantal || 0));
  }
  return [...totalen].sort((a, b) => b[1] - a[1]);
}
