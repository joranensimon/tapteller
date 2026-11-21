/**
 * Dynamische ranglijst op de beamer.
 * Elke groep is één rij die vast blijft bestaan; de plaats wordt met CSS-variabelen (--kolom, --rij)
 * bepaald, zodat rijen zachtjes verspringen als een groep een andere inhaalt of van pagina wisselt.
 */
import { h, leeg } from "../lib/dom.js";
import { aandeel } from "../lib/puntentelling.js";
import { getal, initialen } from "../lib/opmaak.js";
import { cssUrl, isAfbeelding } from "../lib/media.js";

export function maakRanglijst(wortel) {
  const rijen = new Map();

  function maakRij(id) {
    const rang = h("span", { class: "rij__rang" });
    const foto = h("span", { class: "rij__foto" });
    const naam = h("span", { class: "rij__naam" });
    const vul = h("span", { class: "rij__vul" });
    const waarde = h("span", { class: "rij__waarde" });
    const rij = h("div", { class: "rij rij--weg", role: "listitem", data: { id } },
      h("div", { class: "rij__binnen" },
        rang,
        foto,
        h("div", { class: "rij__midden" }, naam, h("div", { class: "rij__balk" }, vul)),
        waarde,
      ),
    );
    const onderdelen = { rij, rang, foto, naam, vul, waarde, vorige: null };
    wortel.append(rij);
    rijen.set(id, onderdelen);
    return onderdelen;
  }

  function toonMelding(tekst) {
    rijen.clear();
    leeg(wortel).append(h("p", { class: "grafiek__melding", tekst }));
  }

  /**
   * @param {Array<{id: string, naam: string, aantal: number, foto: string}>} lijst  alle groepen, gerangschikt
   * @param {{ kolommen: number, rijen: number, perBlad: number, pagina: number }} indeling
   */
  function teken(lijst, indeling) {
    wortel.querySelector(".grafiek__melding")?.remove();

    if (!lijst.length) {
      toonMelding("Nog geen groepen. Voeg ze toe via de adminpagina.");
      return;
    }

    wortel.style.setProperty("--rijen", indeling.rijen);
    wortel.style.setProperty("--kolommen", indeling.kolommen);

    const hoogste = lijst[0].aantal;
    wortel.classList.toggle("ranglijst--zonder-foto", !lijst.some((g) => isAfbeelding(g.foto)));
    const gezien = new Set();

    lijst.forEach((groep, index) => {
      gezien.add(groep.id);
      const nieuw = !rijen.has(groep.id);
      const o = rijen.get(groep.id) ?? maakRij(groep.id);

      const rang = index + 1;
      const pagina = Math.floor(index / indeling.perBlad);
      const plek = index % indeling.perBlad;
      const zichtbaar = pagina === indeling.pagina;

      o.rij.style.setProperty("--kolom", Math.floor(plek / indeling.rijen));
      o.rij.style.setProperty("--rij", plek % indeling.rijen);
      o.rij.style.setProperty("--aandeel", aandeel(groep.aantal, hoogste));
      o.rij.classList.toggle("rij--weg", !zichtbaar);
      o.rij.classList.toggle("rij--leider", rang === 1 && groep.aantal > 0);
      o.rij.classList.toggle("rij--zilver", rang === 2 && groep.aantal > 0);
      o.rij.classList.toggle("rij--brons", rang === 3 && groep.aantal > 0);
      o.rij.setAttribute("aria-hidden", String(!zichtbaar));
      o.rij.setAttribute("aria-label", `${groep.naam}: ${getal(groep.aantal)} punten, plaats ${rang}`);

      o.rang.textContent = rang;
      o.naam.textContent = groep.naam;
      o.waarde.textContent = getal(groep.aantal);

      const heeftFoto = isAfbeelding(groep.foto);
      o.foto.classList.toggle("rij__foto--leeg", !heeftFoto);
      o.foto.textContent = heeftFoto ? "" : initialen(groep.naam);
      if (heeftFoto) o.foto.style.setProperty("--foto", cssUrl(groep.foto));

      if (!nieuw && o.vorige !== null && groep.aantal > o.vorige && zichtbaar) {
        o.rij.querySelector(".rij__binnen").animate?.(
          [{ backgroundColor: "color-mix(in srgb, var(--merk) 38%, var(--vlak))" }, { backgroundColor: "var(--vlak)" }],
          { duration: 1400, easing: "ease-out" },
        );
      }
      o.vorige = groep.aantal;
    });

    for (const [id, o] of rijen) {
      if (!gezien.has(id)) {
        o.rij.remove();
        rijen.delete(id);
      }
    }
  }

  return { teken, toonMelding };
}
