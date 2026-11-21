/**
 * Alle schrijfacties naar de database. De interface roept enkel deze functies aan,
 * zodat de datastructuur op één plek te vinden en aan te passen is.
 */
import { db, ref, set, push, update, remove, increment } from "../firebase/db.js";
import { PAD } from "./paden.js";

const wortel = () => ref(db);

/* Instellingen -------------------------------------------------------- */

export const wijzigInstellingen = (velden) => update(ref(db, PAD.instellingen), velden);
export const zetLogo = (dataUrl) => set(ref(db, PAD.logo), dataUrl);
export const wisLogo = () => remove(ref(db, PAD.logo));

/* Groepen ------------------------------------------------------------- */

export const maakGroep = (naam) => push(ref(db, PAD.groepen), { naam, aantal: 0, t: Date.now() });
/** Maakt meerdere groepen in één keer aan (één schrijfactie). */
export function maakGroepen(namen) {
  const wijzigingen = {};
  const nu = Date.now();
  namen.forEach((naam, i) => { wijzigingen[PAD.groep(push(ref(db, PAD.groepen)).key)] = { naam, aantal: 0, t: nu + i }; });
  return update(wortel(), wijzigingen);
}
export const hernoemGroep = (id, naam) => update(ref(db, PAD.groep(id)), { naam });
export const zetGroepFoto = (id, dataUrl) => update(ref(db, PAD.groep(id)), { foto: dataUrl });
export const wisGroepFoto = (id) => remove(ref(db, PAD.groepFoto(id)));
export const verwijderGroep = (id) => update(wortel(), { [PAD.groep(id)]: null, [PAD.gif(id)]: null });
export const zetGif = (id, bron) => set(ref(db, PAD.gif(id)), bron);
export const wisGif = (id) => remove(ref(db, PAD.gif(id)));

/** Telt punten bij (of, met een negatief getal, af) bij één groep. */
export const wijzigPunten = (id, verschil) => update(wortel(), { [PAD.aantal(id)]: increment(verschil) });

/** Zet de drank- en eetpunten van alle groepen op 0. */
export function zetAllePuntenOpNul(groepIds) {
  return update(wortel(), Object.fromEntries(groepIds.flatMap((id) => [[PAD.aantal(id), 0], [PAD.eten(id), 0]])));
}

/* Drankkaart ---------------------------------------------------------- */

export const maakDrank = (drank) => push(ref(db, PAD.kaart), drank);
export const wijzigDrank = (id, velden) => update(ref(db, PAD.drank(id)), velden);
/** Zet bij alle opgegeven dranken de punten gelijk aan het aantal bonnetjes. */
export function zetPuntenGelijkAanBonnetjes(dranken) {
  const wijzigingen = {};
  for (const d of dranken) wijzigingen[`${PAD.drank(d.id)}/punten`] = d.prijs ?? 0;
  return update(wortel(), wijzigingen);
}
export const verwijderDrank = (id) => remove(ref(db, PAD.drank(id)));

export function zetVolgorde(volgordePerId) {
  return update(wortel(), Object.fromEntries(Object.entries(volgordePerId).map(([id, v]) => [`${PAD.drank(id)}/v`, v])));
}

export function importeerDranken(dranken) {
  const wijzigingen = {};
  for (const drank of dranken) wijzigingen[PAD.drank(push(ref(db, PAD.kaart)).key)] = drank;
  return update(wortel(), wijzigingen);
}

/* Bestellingen -------------------------------------------------------- */

/** Slaat de bestelling op en telt de punten bij de groep op, in één atomaire schrijfactie. */
export async function plaatsBestelling(bestelling) {
  const sleutel = push(ref(db, PAD.bestellingen)).key;
  const wijzigingen = { [PAD.bestelling(sleutel)]: bestelling };
  if (bestelling.punten > 0) wijzigingen[PAD.aantal(bestelling.groep)] = increment(bestelling.punten);
  if (bestelling.eten > 0) wijzigingen[PAD.eten(bestelling.groep)] = increment(bestelling.eten);
  await update(wortel(), wijzigingen);
  return sleutel;
}

/** Markeert een bestelling als geannuleerd en trekt de drank- en eetpunten af (nooit onder nul). */
export function annuleerBestelling(sleutel, bestelling, groep) {
  const wijzigingen = { [`${PAD.bestelling(sleutel)}/geannuleerd`]: true };
  const dranken = Math.min(bestelling.punten || 0, groep?.aantal ?? 0);
  const eten = Math.min(bestelling.eten || 0, groep?.eten ?? 0);
  if (dranken > 0) wijzigingen[PAD.aantal(bestelling.groep)] = increment(-dranken);
  if (eten > 0) wijzigingen[PAD.eten(bestelling.groep)] = increment(-eten);
  return update(wortel(), wijzigingen);
}

export const wisAlleBestellingen = () => remove(ref(db, PAD.bestellingen));
