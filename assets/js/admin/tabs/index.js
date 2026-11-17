/**
 * Register van alle tabbladen. Een nieuw tabblad toevoegen = een bestand in deze map maken
 * en het hier in de lijst zetten. De volgorde hieronder is de volgorde in de navigatie.
 *
 * Een tabblad is een object:
 *   id              unieke naam, ook gebruikt in de URL (admin.html#id)
 *   label()         tekst in de navigatie en als paginatitel
 *   icoon           naam van een icoon uit lib/iconen.js
 *   sectie          "bar" of "beheer": onder welke kop het in de zijbalk staat
 *   uitleg()        (optioneel) korte zin onder de paginatitel
 *   breed           (optioneel) true = gebruik de volle breedte van het scherm
 *   watch           welke delen van de state een nieuwe weergave veroorzaken
 *   beschermInvoer  (optioneel) niet hertekenen terwijl de gebruiker typt
 *   render(wortel, ctx)  bouwt de inhoud; ctx.herteken() tekent opnieuw, ctx.voet is de balk onderaan
 */
import { overzicht } from "./overzicht.js";
import { kassa } from "./kassa.js";
import { snel } from "./snel.js";
import { bestellingenTab } from "./bestellingen.js";
import { groepenTab } from "./groepen.js";
import { kaartTab } from "./kaart.js";
import { instellingenTab } from "./instellingen.js";

export const SECTIES = [
  { id: "bar", titel: "Bar" },
  { id: "beheer", titel: "Beheer" },
];

export const TABS = [overzicht, kassa, snel, bestellingenTab, groepenTab, kaartTab, instellingenTab];
