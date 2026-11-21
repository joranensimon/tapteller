/**
 * Regie van de beamer: welke beker (drank/eten), welke pagina, lijst of grafiek,
 * automatisch doorbladeren en de knoppen om zelf door te klikken.
 */
import { rangschik } from "../lib/puntentelling.js";
import { indeling as maakIndeling, maakDias, plaatsBereik, volgende, vorige } from "../lib/paginering.js";

const BEKERS = {
  drank: { veld: "aantal", naam: "Drankbeker" },
  eten: { veld: "eten", naam: "Eetbeker" },
};
const STANDAARD = { perPagina: 10, wisselSec: 10 };
const MAX_GRAFIEK = 10;

const getalOf = (waarde, standaard) => (Number.isFinite(waarde) ? waarde : standaard);

export function maakRegie({ lijst, grafiek, kop, knoppen, schermen, bijScore }) {
  let groepen = {};
  let instellingen = {};
  let alles = false;
  let dia = 0;
  let timer = null;
  const vorigeScores = { aantal: new Map(), eten: new Map() };

  function opties() {
    return {
      weergave: instellingen.weergave === "grafiek" ? "grafiek" : "lijst",
      perPagina: Math.max(0, getalOf(instellingen.perPagina, STANDAARD.perPagina)),
      wisselSec: Math.max(0, getalOf(instellingen.wisselSec, STANDAARD.wisselSec)),
      beker: instellingen.beker === "eten" || instellingen.beker === "wissel" ? instellingen.beker : "drank",
    };
  }

  function bepaalIndeling(opt, totaal) {
    if (opt.weergave === "grafiek") {
      const per = Math.max(1, Math.min(opt.perPagina || MAX_GRAFIEK, MAX_GRAFIEK));
      if (alles) return { kolommen: 1, rijen: 1, perBlad: Math.max(1, totaal), paginas: 1 };
      return { kolommen: 1, rijen: 1, perBlad: per, paginas: Math.max(1, Math.ceil(totaal / per)) };
    }
    return maakIndeling({ totaal, perPagina: opt.perPagina, alles });
  }

  function teken() {
    const opt = opties();
    const totaal = Object.keys(groepen).length;
    const lay = bepaalIndeling(opt, totaal);
    const bekers = opt.beker === "wissel" ? ["drank", "eten"] : [opt.beker];
    const dias = maakDias(bekers, lay.paginas);
    dia = Math.min(dia, dias.length - 1);
    const huidig = dias[dia];
    const beker = BEKERS[huidig.beker];

    const ranglijst = rangschik(groepen, beker.veld);
    kop.zetTotaal(ranglijst.reduce((som, g) => som + g.aantal, 0));

    const metLijst = opt.weergave === "lijst";
    schermen.lijst.hidden = !metLijst;
    schermen.grafiek.hidden = metLijst;

    if (metLijst) {
      lijst.teken(ranglijst, { ...lay, pagina: huidig.pagina });
    } else if (!ranglijst.length) {
      grafiek.toonMelding("Nog geen groepen. Voeg ze toe via de adminpagina.");
    } else {
      const begin = huidig.pagina * lay.perBlad;
      grafiek.tekenLijst(ranglijst.slice(begin, begin + lay.perBlad), { offset: begin, hoogste: ranglijst[0].aantal });
    }

    const delen = [];
    if (bekers.length > 1 || huidig.beker === "eten") delen.push(beker.naam);
    if (lay.paginas > 1) delen.push(plaatsBereik(huidig.pagina, lay, totaal));
    kop.zetStatus(delen.join(" · "));

    const kanBladeren = dias.length > 1;
    const kanAlles = alles || lay.paginas > 1;
    knoppen.wrapper.hidden = !(kanBladeren || kanAlles);
    knoppen.vorige.hidden = knoppen.volgende.hidden = !kanBladeren;
    knoppen.alles.hidden = !kanAlles;
    knoppen.alles.textContent = alles ? "In pagina’s" : `Alle ${totaal} tonen`;
    knoppen.alles.setAttribute("aria-pressed", String(alles));

    plan(dias.length, opt.wisselSec);
  }

  function plan(aantalDias, seconden) {
    clearInterval(timer);
    timer = null;
    if (aantalDias > 1 && seconden > 0) timer = setInterval(() => ga(volgende(dia, aantalDias)), seconden * 1000);
  }

  const ga = (index) => {
    dia = index;
    teken();
  };

  function aantalDias() {
    const opt = opties();
    const lay = bepaalIndeling(opt, Object.keys(groepen).length);
    return (opt.beker === "wissel" ? 2 : 1) * lay.paginas;
  }

  function zoekScoreStijgingen(nieuw) {
    for (const [beker, { veld }] of Object.entries(BEKERS)) {
      const vorige = vorigeScores[veld];
      const nu = new Map();
      for (const [id, groep] of Object.entries(nieuw ?? {})) {
        const score = Number(groep[veld]) || 0;
        nu.set(id, score);
        const eerder = vorige.get(id);
        if (eerder !== undefined && score > eerder) bijScore({ id, naam: groep.naam || "?", plus: score - eerder, beker });
      }
      vorigeScores[veld] = nu;
    }
  }

  return {
    zetGroepen(nieuw) {
      zoekScoreStijgingen(nieuw);
      groepen = nieuw ?? {};
      teken();
    },
    zetInstellingen(nieuw) {
      instellingen = nieuw ?? {};
      teken();
    },
    volgende() {
      ga(volgende(dia, aantalDias()));
    },
    vorige() {
      ga(vorige(dia, aantalDias()));
    },
    wisselAlles() {
      alles = !alles;
      dia = 0;
      teken();
    },
    toonMelding(tekst) {
      clearInterval(timer);
      schermen.lijst.hidden = true;
      schermen.grafiek.hidden = false;
      grafiek.toonMelding(tekst);
    },
  };
}
