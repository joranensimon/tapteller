/** Bestellingen: cijfers, filter, tabel met annuleren en export. */
import { h } from "../../lib/dom.js";
import { bonnetjes, getal, klok } from "../../lib/opmaak.js";
import { bestellingenNaarCsv } from "../../lib/csv.js";
import { downloadTekst } from "../../lib/download.js";
import { icoon } from "../../lib/iconen.js";
import { avatar } from "../../componenten/avatar.js";
import { bevestig } from "../../componenten/dialoog.js";
import { toast } from "../../componenten/toast.js";
import { annuleerBestelling } from "../../data/schrijven.js";
import { bestellingen as alleBestellingen, groepen, woorden } from "../selectors.js";
import { state } from "../state.js";
import { meldFout } from "../fouten.js";

const TOON_MAX = 100;

let filterGroep = ""; // "" = alle
let toonGeannuleerd = true;

export const bestellingenTab = {
  id: "bestellingen",
  label: () => "Bestellingen",
  kort: () => "Orders",
  icoon: "bestellingen",
  sectie: "bar",
  uitleg: () => "Alle bestellingen, met annuleren en export.",
  breed: true,
  watch: ["bestellingen", "instellingen", "groepen"],

  render(wortel, ctx) {
    const w = woorden();
    const alles = alleBestellingen();
    if (filterGroep && !state.groepen[filterGroep]) filterGroep = "";

    const geldig = alles.filter((b) => !b.geannuleerd);
    const geannuleerd = alles.length - geldig.length;
    const lijst = alles.filter((b) => (!filterGroep || b.groep === filterGroep) && (toonGeannuleerd || !b.geannuleerd));

    wortel.append(
      h("div", { class: "kpis kpis--drie" },
        kpi("Bestellingen", getal(geldig.length)),
        kpi("Bonnetjes in totaal", getal(geldig.reduce((s, b) => s + (b.bonnetjes || 0), 0))),
        kpi("Geannuleerd", getal(geannuleerd)),
      ),
    );

    const groepKeuze = h("select", { class: "keuze keuze--compact", "aria-label": `Filter op ${w.enkelvoud.toLowerCase()}` },
      h("option", { value: "", tekst: `Alle ${w.meervoud.toLowerCase()}` }),
      groepen().map((g) => h("option", { value: g.id, selected: g.id === filterGroep, tekst: g.naam })),
    );
    groepKeuze.addEventListener("change", () => { filterGroep = groepKeuze.value; ctx.herteken(); });

    const vink = h("input", { class: "vink", type: "checkbox", checked: toonGeannuleerd, id: "toon-geannuleerd" });
    vink.addEventListener("change", () => { toonGeannuleerd = vink.checked; ctx.herteken(); });

    wortel.append(
      h("section", { class: "kaart kaart--tabel" },
        h("div", { class: "gereedschap" },
          groepKeuze,
          h("label", { class: "vinklabel", for: "toon-geannuleerd" }, vink, "Toon geannuleerde"),
          h("span", { class: "gereedschap__rest" }),
          h("button", { class: "knop knop--klein", type: "button", disabled: !alles.length, onclick: () => exporteer(alles) }, icoon("download"), "Exporteer CSV"),
        ),
        lijst.length ? tabel(lijst) : h("p", { class: "leeg leeg--tabel", tekst: alles.length ? "Geen bestellingen met deze filter." : "Nog geen bestellingen." }),
        lijst.length > TOON_MAX && h("p", { class: "notitie notitie--voet", tekst: `Eerste ${TOON_MAX} van ${lijst.length} getoond. Exporteer voor de volledige lijst.` }),
      ),
    );
  },
};

function kpi(label, waarde) {
  return h("div", { class: "kpi" }, h("p", { class: "kpi__label", tekst: label }), h("p", { class: "kpi__waarde", tekst: waarde }));
}

function tabel(lijst) {
  return h("div", { class: "tabel-wikkel" },
    h("table", { class: "tabel" },
      h("thead", {}, h("tr", {},
        h("th", { scope: "col", tekst: "Tijd" }),
        h("th", { scope: "col", tekst: "Bestelling" }),
        h("th", { class: "tabel__getal", scope: "col", tekst: "Bonnetjes" }),
        h("th", { class: "tabel__getal", scope: "col", tekst: "Punten" }),
        h("th", { class: "tabel__door", scope: "col", tekst: "Door" }),
        h("th", { class: "tabel__status", scope: "col", tekst: "Status" }),
        h("th", { class: "tabel__actie", scope: "col" }, h("span", { class: "verborgen", tekst: "Acties" })),
      )),
      h("tbody", {}, lijst.slice(0, TOON_MAX).map(rij)),
    ),
  );
}

function rij(b) {
  const wat = Object.values(b.items ?? {}).map((i) => `${i.aantal}× ${i.naam}`).join(", ");
  const door = (b.door || "").split("@")[0];
  const groep = state.groepen[b.groep];

  return h("tr", { class: b.geannuleerd ? "tabel__rij--vervallen" : "" },
    h("td", { class: "tabel__tijd", tekst: klok(b.t) }),
    h("td", {},
      h("div", { class: "cel-groep" },
        avatar(groep?.foto, { naam: b.groepNaam }),
        h("div", { class: "cel-groep__tekst" },
          h("p", { class: "cel-groep__naam", tekst: b.groepNaam || "?" }),
          h("p", { class: "cel-groep__detail", tekst: wat }),
        ),
      ),
    ),
    h("td", { class: "tabel__getal", tekst: getal(b.bonnetjes) }),
    h("td", { class: "tabel__getal", tekst: getal(b.punten) }),
    h("td", { class: "tabel__door", tekst: door }),
    h("td", { class: "tabel__status" }, h("span", { class: `badge ${b.geannuleerd ? "badge--neutraal" : "badge--succes"}`, tekst: b.geannuleerd ? "Geannuleerd" : "Afgerekend" })),
    h("td", { class: "tabel__actie" },
      !b.geannuleerd && h("button", { class: "knop knop--klein knop--spook knop--gevaar", type: "button", tekst: "Annuleer", onclick: () => annuleer(b) }),
    ),
  );
}

async function annuleer(b) {
  const ok = await bevestig({
    titel: "Bestelling annuleren?",
    tekst: `${b.groepNaam}: ${bonnetjes(b.bonnetjes)}, ${getal(b.punten)} punten worden afgetrokken.`,
    knop: "Annuleren",
    gevaar: true,
  });
  if (!ok) return;
  try {
    await annuleerBestelling(b.id, b, state.groepen[b.groep]?.aantal);
    toast("Bestelling geannuleerd");
  } catch (fout) {
    meldFout(fout, "Annuleren lukte niet");
  }
}

function exporteer(lijst) {
  const naam = state.instellingen.naam || "bestellingen";
  downloadTekst(`${naam}.csv`, bestellingenNaarCsv(lijst, { groepWoord: woorden().enkelvoud }));
}
