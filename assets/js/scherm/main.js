/** Opstartpunt van de beamer-weergave (index.html). */
import { APP } from "../config.js";
import { PAD } from "../data/paden.js";
import { isGif } from "../lib/media.js";
import { getal } from "../lib/opmaak.js";
import { maakGrafiek } from "./grafiek.js";
import { maakRanglijst } from "./ranglijst.js";
import { maakRegie } from "./regie.js";
import { maakGifSpeler } from "./gif-speler.js";
import { maakKop } from "./kop.js";
import { startKlok } from "./klok.js";
import { startInactiviteit } from "./inactief.js";

const el = (id) => document.getElementById(id);

const kop = maakKop({ titel: el("titel"), evenement: el("evenement"), logo: el("logo"), totaal: el("totaal"), status: el("status") });
const gifSpeler = maakGifSpeler(el("gif"), { duurMs: APP.gifDuurMs });

let gifs = {};

const regie = maakRegie({
  lijst: maakRanglijst(el("lijst")),
  grafiek: maakGrafiek(el("grafiek")),
  kop,
  schermen: { lijst: el("lijst"), grafiek: el("grafiek") },
  knoppen: { wrapper: el("bladeren"), vorige: el("bladVorige"), volgende: el("bladVolgende"), alles: el("bladAlles") },
  bijScore({ id, naam, plus }) {
    const bron = gifs[id];
    if (isGif(bron)) gifSpeler.speel({ src: bron, naam, plus: getal(plus) });
  },
});

startKlok(el("klok"));
startInactiviteit(document.body, { naMs: APP.inactiefNaMs });

el("volScherm").addEventListener("click", () => {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen?.().catch(() => {});
});

// Zelf doorklikken: knoppen, klik op het scherm of het toetsenbord
el("bladVolgende").addEventListener("click", () => regie.volgende());
el("bladVorige").addEventListener("click", () => regie.vorige());
el("bladAlles").addEventListener("click", () => regie.wisselAlles());
document.querySelector(".bord").addEventListener("click", (e) => {
  if (!e.target.closest("button, a")) regie.volgende();
});
window.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") regie.volgende();
  else if (e.key === "ArrowLeft" || e.key === "PageUp") regie.vorige();
  else if (e.key === "a" || e.key === "A") regie.wisselAlles();
  else return;
  e.preventDefault();
});

async function start() {
  let luister;
  try {
    ({ luister } = await import("../data/lezen.js"));
  } catch {
    regie.toonMelding("Geen verbinding met de database. Controleer het internet en herlaad de pagina.");
    return;
  }

  luister(PAD.instellingen, (v) => {
    const instellingen = v ?? {};
    kop.zetTitel(instellingen.titel);
    kop.zetNaam(instellingen.naam);
    kop.zetLogo(instellingen.logo);
    regie.zetInstellingen(instellingen);
  });
  luister(PAD.gifs, (v) => { gifs = v ?? {}; });
  luister(
    PAD.groepen,
    (groepen) => regie.zetGroepen(groepen),
    () => regie.toonMelding("Geen toegang tot de gegevens. Zijn de databaseregels gepubliceerd?"),
  );
}

start();
