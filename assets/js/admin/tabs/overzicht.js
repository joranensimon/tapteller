/** Overzicht: kerncijfers, klassement, recente bestellingen en snelle acties in één blik. */
import { h } from "../../lib/dom.js";
import { bonnetjes, getal, klok } from "../../lib/opmaak.js";
import { aandeel, rangschik } from "../../lib/puntentelling.js";
import { bestellingenNaarCsv } from "../../lib/csv.js";
import { downloadTekst } from "../../lib/download.js";
import { icoon } from "../../lib/iconen.js";
import { avatar } from "../../componenten/avatar.js";
import { bestellingen, geldigeBestellingen, modus, verkoopPerDrank, woorden } from "../selectors.js";
import { state } from "../state.js";
import { naar } from "../router.js";

const RECENT = 6;
const TOP_DRANKEN = 6;

export const overzicht = {
  id: "overzicht",
  label: () => "Overzicht",
  icoon: "overzicht",
  sectie: "bar",
  uitleg: () => "Zo staat het evenement er nu voor.",
  breed: true,
  watch: ["groepen", "bestellingen", "instellingen", "kaart"],

  render(wortel) {
    const w = woorden();
    const lijst = rangschik(state.groepen);
    const geldig = geldigeBestellingen();
    const totaalPunten = lijst.reduce((som, g) => som + (g.aantal || 0), 0);
    const totaalBon = geldig.reduce((som, b) => som + (b.bonnetjes || 0), 0);
    const laatste = geldig[0];

    wortel.append(
      h("div", { class: "kpis" },
        kpi("Punten in totaal", getal(totaalPunten), lijst[0] && lijst[0].aantal > 0 ? `${lijst[0].naam} staat eerst` : "Nog niemand gestart"),
        kpi("Bestellingen", getal(geldig.length), laatste ? `Laatste om ${klok(laatste.t)}` : "Nog geen bestellingen"),
        kpi("Bonnetjes", getal(totaalBon), geldig.length ? `Gemiddeld ${getal(totaalBon / geldig.length)} per bestelling` : "Nog niets verkocht"),
        kpi(w.meervoud, getal(lijst.length), modus() === "zuipbeker" ? "Modus Zuipbeker" : "Modus Bonnetjes"),
      ),

      h("div", { class: "raster-2" },
        kaart("Klassement", null, klassement(lijst, w)),
        kaart("Recente bestellingen", { label: "Alles bekijken", naar: "bestellingen" }, recent(geldig)),
        kaart("Populairste dranken", null, dranken(geldig)),
        kaart("Snelle acties", null, acties()),
      ),
    );
  },
};

function kpi(label, waarde, sub) {
  return h("div", { class: "kpi" },
    h("p", { class: "kpi__label", tekst: label }),
    h("p", { class: "kpi__waarde", tekst: waarde }),
    h("p", { class: "kpi__sub", tekst: sub }),
  );
}

function kaart(titel, link, inhoud) {
  return h("section", { class: "kaart" },
    h("div", { class: "kaart__kop" },
      h("h2", { class: "kaart__titel", tekst: titel }),
      link && h("button", { class: "tekstknop", type: "button", tekst: link.label, onclick: () => naar(link.naar) }),
    ),
    inhoud,
  );
}

const leeg = (tekst, actie) =>
  h("div", { class: "leeg" }, h("p", { class: "leeg__tekst", tekst }), actie && h("button", { class: "knop knop--klein", type: "button", tekst: actie.label, onclick: () => naar(actie.naar) }));

function klassement(lijst, w) {
  if (!lijst.length) return leeg(`Nog geen ${w.meervoud.toLowerCase()}.`, { label: `${w.meervoud} toevoegen`, naar: "groepen" });
  const hoogste = lijst[0].aantal || 0;
  return h("ol", { class: "rangen" },
    lijst.map((g, i) =>
      h("li", { class: `rang${i === 0 && hoogste > 0 ? " rang--eerste" : ""}` },
        h("span", { class: "rang__nr", tekst: i + 1 }),
        avatar(g.foto, { naam: g.naam }),
        h("div", { class: "rang__midden" },
          h("p", { class: "rang__naam", tekst: g.naam }),
          h("div", { class: "balkje" }, h("div", { class: "balkje__vul", vars: { "--aandeel": `${aandeel(g.aantal, hoogste)}%` } })),
        ),
        h("span", { class: "rang__punten", tekst: `${getal(g.aantal)} pt` }),
      ),
    ),
  );
}

function recent(geldig) {
  if (!geldig.length) return leeg("Zodra er besteld wordt, verschijnt het hier.", { label: "Naar de kassa", naar: "kassa" });
  return h("ul", { class: "activiteit" },
    geldig.slice(0, RECENT).map((b) =>
      h("li", { class: "activiteit__rij" },
        h("span", { class: "activiteit__tijd", tekst: klok(b.t) }),
        h("div", { class: "activiteit__midden" },
          h("p", { class: "activiteit__titel", tekst: b.groepNaam || "?" }),
          h("p", { class: "activiteit__detail", tekst: Object.values(b.items ?? {}).map((i) => `${i.aantal}× ${i.naam}`).join(", ") }),
        ),
        h("span", { class: "badge badge--succes", tekst: `+${getal(b.punten)} pt` }),
      ),
    ),
  );
}

function dranken(geldig) {
  const top = verkoopPerDrank(geldig).slice(0, TOP_DRANKEN);
  if (!top.length) return leeg("Nog niets verkocht.");
  const hoogste = top[0][1];
  return h("ul", { class: "rangen" },
    top.map(([naam, aantal]) =>
      h("li", { class: "rang rang--drank" },
        h("div", { class: "rang__midden" },
          h("p", { class: "rang__naam", tekst: naam }),
          h("div", { class: "balkje" }, h("div", { class: "balkje__vul balkje__vul--donker", vars: { "--aandeel": `${aandeel(aantal, hoogste)}%` } })),
        ),
        h("span", { class: "rang__punten", tekst: `${getal(aantal)}×` }),
      ),
    ),
  );
}

function acties() {
  const alle = bestellingen();
  return h("div", { class: "acties" },
    h("button", { class: "knop knop--primair", type: "button", onclick: () => naar("kassa") }, icoon("kassa"), "Nieuwe bestelling"),
    h("button", { class: "knop", type: "button", onclick: () => naar("snel") }, icoon("snel"), "Snel tellen"),
    h("a", { class: "knop", href: "./", target: "_blank", rel: "noopener" }, icoon("scherm"), "Beamer openen"),
    h("button", {
      class: "knop",
      type: "button",
      disabled: !alle.length,
      onclick: () => downloadTekst(`${state.instellingen.naam || "bestellingen"}.csv`, bestellingenNaarCsv(alle, { groepWoord: woorden().enkelvoud })),
    }, icoon("download"), "Exporteer CSV"),
  );
}
