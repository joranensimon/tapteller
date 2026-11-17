/** De beheer-app: zijbalk, paginakop, inhoud en de balk onderaan. */
import { h, leeg } from "../lib/dom.js";
import { icoon } from "../lib/iconen.js";
import { abonneer } from "./state.js";
import { startRouter } from "./router.js";
import { SECTIES, TABS } from "./tabs/index.js";

const $nav = document.getElementById("tabs");
const $inhoud = document.getElementById("inhoud");
const $balk = document.getElementById("mand");
const $app = document.getElementById("weergave-app");
const $titel = document.getElementById("paginatitel");
const $uitleg = document.getElementById("paginauitleg");

let actief = null;
let gestart = false;

const voet = {
  toon(inhoud) {
    $balk.replaceChildren(inhoud);
    $balk.hidden = false;
    $app.classList.add("app--met-balk");
  },
  verberg() {
    $balk.hidden = true;
    $balk.replaceChildren();
    $app.classList.remove("app--met-balk");
  },
};

// Houdt de hoogte van de balk onderaan bij, zodat inhoud en meldingen er netjes boven blijven
new ResizeObserver(() => document.documentElement.style.setProperty("--balk-hoogte", `${$balk.offsetHeight}px`)).observe($balk);

const ctx = { voet, herteken: () => teken(true) };

function bouwNavigatie() {
  for (const sectie of SECTIES) {
    const tabs = TABS.filter((t) => t.sectie === sectie.id);
    if (!tabs.length) continue;
    $nav.append(
      h("div", { class: "nav__groep", role: "group", "aria-label": sectie.titel },
        h("p", { class: "nav__titel", tekst: sectie.titel }),
        tabs.map((tab) =>
          h("a", { class: "nav__link", id: `tab-${tab.id}`, href: `#${tab.id}`, data: { tab: tab.id } },
            icoon(tab.icoon),
            h("span", { class: "nav__label" }),
            h("span", { class: "nav__kort" }),
          ),
        ),
      ),
    );
  }
}

function verfrisNavigatie() {
  for (const link of $nav.querySelectorAll(".nav__link")) {
    const tab = TABS.find((t) => t.id === link.dataset.tab);
    link.querySelector(".nav__label").textContent = tab.label();
    link.querySelector(".nav__kort").textContent = tab.kort?.() ?? tab.label();
    if (tab === actief) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
}

function verfrisKop() {
  if (!actief) return;
  $titel.textContent = actief.label();
  $uitleg.textContent = actief.uitleg?.() ?? "";
  $uitleg.hidden = !$uitleg.textContent;
  $inhoud.classList.toggle("app__inhoud--smal", !actief.breed);
}

const typtNu = () => {
  const el = document.activeElement;
  return Boolean(el && $inhoud.contains(el) && el.matches("input:not([type=checkbox]):not([type=file]), textarea, select"));
};

function teken(geforceerd) {
  if (!actief) return;
  if (!geforceerd && actief.beschermInvoer && typtNu()) return;

  voet.verberg();
  leeg($inhoud);
  actief.render($inhoud, ctx);
  verfrisNavigatie();
  verfrisKop();
}

function toonTab(id) {
  actief = TABS.find((t) => t.id === id) ?? TABS[0];
  teken(true);
  window.scrollTo(0, 0);
}

/** Start de app één keer; daarna reageert ze vanzelf op state-wijzigingen en de URL. */
export function startShell() {
  if (gestart) return;
  gestart = true;

  bouwNavigatie();
  startRouter(TABS.map((t) => t.id), toonTab);

  abonneer((sleutels) => {
    if (!actief) return;
    if (sleutels.includes("instellingen")) {
      verfrisNavigatie();
      verfrisKop();
    }
    if (actief.watch.some((s) => sleutels.includes(s))) teken(false);
  });
}
