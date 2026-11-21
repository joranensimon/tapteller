/**
 * End-to-end test met een nagebootste Firebase (tests/e2e/mocks).
 * Draaien:  npm i  &&  npx playwright-core install chromium  &&  npm run test:e2e
 * Eigen Chrome gebruiken:  CHROME_PAD=/pad/naar/chrome npm run test:e2e
 */
import http from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const WORTEL = fileURLToPath(new URL("../../", import.meta.url));
const MOCKS = fileURLToPath(new URL("./mocks/", import.meta.url));
const UITVOER = fileURLToPath(new URL("./uitvoer/", import.meta.url));
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json" };
const PIXEL_GIF = "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";

await mkdir(UITVOER, { recursive: true });

const server = http.createServer(async (verzoek, antwoord) => {
  try {
    const pad = normalize(decodeURIComponent(new URL(verzoek.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
    const bestand = join(WORTEL, pad === "/" ? "index.html" : pad);
    antwoord.writeHead(200, { "content-type": TYPES[extname(bestand)] ?? "application/octet-stream" });
    antwoord.end(await readFile(bestand));
  } catch {
    antwoord.writeHead(404).end();
  }
});
await new Promise((klaar) => server.listen(0, klaar));
const basis = `http://localhost:${server.address().port}`;

const browser = await chromium.launch(process.env.CHROME_PAD ? { executablePath: process.env.CHROME_PAD } : {});

async function nieuwePagina(opties, { zaad = {}, gebruiker } = {}) {
  const context = await browser.newContext(opties);
  await context.route(/gstatic\.com\/firebasejs\//, (r) =>
    r.fulfill({ path: MOCKS + r.request().url().split("/").pop(), contentType: "text/javascript" }),
  );
  const pagina = await context.newPage();
  const problemen = [];
  pagina.on("pageerror", (e) => problemen.push(`pageerror: ${e.message}`));
  pagina.on("console", (m) => {
    if (m.type() === "error" || /content security policy/i.test(m.text())) problemen.push(`console: ${m.text()}`);
  });
  await pagina.addInitScript(({ zaad, gebruiker }) => {
    window.__seed = zaad;
    if (gebruiker) window.__mockUser = gebruiker;
  }, { zaad, gebruiker });
  return { pagina, problemen, context };
}

const boom = (pagina) => pagina.evaluate(() => JSON.parse(JSON.stringify(window.__mockTree)));
const scores = async (pagina) => Object.fromEntries(Object.values((await boom(pagina)).groepen).map((g) => [g.naam, g.aantal]));
const stap = (naam) => console.log(`  ✓ ${naam}`);

const ZAAD = {
  admins: { u1: true },
  instellingen: { naam: "Quiz Jeugdhuis", titel: "Klassement" },
  groepen: { a: { naam: "KSA", aantal: 10, t: 1 }, b: { naam: "KLJ", aantal: 4, t: 2 }, c: { naam: "Scouts", aantal: 0, t: 3 } },
};

let mislukt = false;
try {
  /* ------------------------------------------------------------------ inloggen */
  console.log("Inloggen");
  {
    const { pagina, problemen, context } = await nieuwePagina({ viewport: { width: 390, height: 844 } }, { zaad: ZAAD });
    await pagina.goto(`${basis}/admin.html`);
    await pagina.waitForSelector("#inlogformulier");
    await pagina.screenshot({ path: UITVOER + "01-inloggen.png" });

    await pagina.fill("#email", "beheer@test.be");
    await pagina.fill("#wachtwoord", "fout");
    await pagina.click("#inlogformulier button[type=submit]");
    await pagina.waitForSelector("#inlogfout:not([hidden])");
    assert.match(await pagina.textContent("#inlogfout"), /klopt niet/);
    stap("verkeerd wachtwoord geeft een duidelijke fout");

    await pagina.fill("#wachtwoord", "goed");
    await pagina.click("#inlogformulier button[type=submit]");
    await pagina.waitForSelector("#weergave-app:not([hidden])");
    assert.equal(await pagina.textContent("#evenementnaam"), "Quiz Jeugdhuis");
    stap("beheerder komt in de app, met de naam van het evenement");

    await pagina.click("[data-uitloggen]:visible");
    await pagina.waitForSelector("#inlogformulier");
    await pagina.fill("#email", "iemand@test.be");
    await pagina.fill("#wachtwoord", "goed");
    await pagina.click("#inlogformulier button[type=submit]");
    await pagina.waitForSelector("#inlogfout:not([hidden]) code");
    assert.equal(await pagina.textContent("#inlogfout code"), "x9");
    stap("een niet-beheerder krijgt zijn UID te zien om toe te voegen");

    assert.deepEqual(problemen, []);
    await context.close();
  }

  /* ------------------------------------------------------------------ beheer */
  console.log("Beheer");
  {
    const { pagina, problemen, context } = await nieuwePagina(
      { viewport: { width: 390, height: 844 }, colorScheme: "dark" },
      { zaad: ZAAD, gebruiker: { email: "beheer@test.be", uid: "u1" } },
    );
    await pagina.goto(`${basis}/admin.html#kassa`);
    await pagina.waitForSelector(".tegel");
    assert.equal((await pagina.$$(".tegel")).length, 3);
    await pagina.screenshot({ path: UITVOER + "02-kassa-groepen.png" });
    stap("kassa toont de groepen");

    // Drankkaart vullen via plakken
    await pagina.click("#tab-kaart");
    assert.match(pagina.url(), /#kaart$/);
    await pagina.click(".uitklap__titel");
    await pagina.fill(".tekstvak", "Pils;1\nStreekbier;2\nWater;1\nCava;3");
    await pagina.click("text=Toevoegen aan de kaart");
    await pagina.waitForSelector(".kaarttabel__rij");
    assert.equal((await pagina.$$(".kaarttabel__rij")).length, 4);
    await pagina.uncheck('input[aria-label="Water telt mee"]');
    await pagina.screenshot({ path: UITVOER + "03-drankkaart.png", fullPage: true });
    stap("drankkaart plakken uit een lijst, en water laten niet meetellen");

    // Kassa: bestelling plaatsen
    await pagina.click("#tab-kassa");
    await pagina.click(".tegel:has-text('KLJ')");
    await pagina.click(".tegel:has-text('Pils')");
    await pagina.click(".tegel:has-text('Pils')");
    await pagina.click(".tegel:has-text('Streekbier')");
    await pagina.click(".tegel:has-text('Water')");
    assert.match(await pagina.textContent(".mand__totaal"), /5\s*bonnetjes/);
    assert.match(await pagina.textContent(".mand__punten"), /\+4 punten voor KLJ/);
    await pagina.screenshot({ path: UITVOER + "04-kassa-bestelling.png" });
    stap("totaal: bonnetjes tellen allemaal, water geeft geen punten");

    await pagina.click(".mand__afrekenen");
    await pagina.waitForSelector(".toast");
    assert.equal((await scores(pagina)).KLJ, 8);
    await pagina.screenshot({ path: UITVOER + "05-na-afrekenen.png" });
    stap("afrekenen telt de punten bij de groep en maakt de kassa leeg");

    // Snel tellen + bevestiging voor een vat
    await pagina.click("#tab-snel");
    await pagina.click(".snel:has-text('KSA') .snelknop:has-text('Streekbier')");
    await pagina.waitForFunction(() => window.__mockTree.groepen.a.aantal === 12);
    await pagina.click(".snel:has-text('KSA') .snelknop:has-text('Vat')");
    await pagina.waitForSelector("dialog[open]");
    await pagina.waitForTimeout(350);
    await pagina.screenshot({ path: UITVOER + "06-dialoog.png" });
    await pagina.click("dialog[open] button[value=annuleer]");
    assert.equal((await scores(pagina)).KSA, 12);
    stap("snelknop telt, een vat vraagt eerst bevestiging (annuleren doet niets)");

    // Modus wisselen
    await pagina.click("#tab-instellingen");
    await pagina.click(".segment__optie:has-text('Eigen weging')");
    await pagina.waitForFunction(() => window.__mockTree.instellingen.modus === "zuipbeker");
    await pagina.screenshot({ path: UITVOER + "07-instellingen.png", fullPage: true });
    stap("wisselen naar Eigen weging");

    // Bestelling annuleren
    await pagina.click("#tab-bestellingen");
    await pagina.click("tbody tr button:has-text('Annuleer')");
    await pagina.click("dialog[open] button[value=ok]");
    await pagina.waitForFunction(() => window.__mockTree.groepen.b.aantal === 4);
    await pagina.screenshot({ path: UITVOER + "08-bestellingen.png", fullPage: true });
    stap("bestelling annuleren geeft de punten terug");

    // Nieuwe groep
    await pagina.click("#tab-groepen");
    await pagina.fill("#nieuwe-groep", "Chiro");
    await pagina.keyboard.press("Enter");
    await pagina.waitForFunction(() => [...document.querySelectorAll("input")].some((i) => i.value === "Chiro"));
    await pagina.click(".groep__meer > summary");
    await pagina.screenshot({ path: UITVOER + "09-groepen.png", fullPage: true });
    stap("groep toevoegen met Enter");

    // Lichte weergave
    await pagina.emulateMedia({ colorScheme: "light" });
    await pagina.click("#tab-kassa");
    await pagina.waitForSelector(".tegel");
    assert.equal(await pagina.evaluate(() => getComputedStyle(document.body).backgroundColor), "rgb(244, 245, 247)");
    await pagina.screenshot({ path: UITVOER + "10-licht.png" });
    stap("lichte weergave volgt het systeem");

    assert.deepEqual(problemen, [], "console- of CSP-fouten in de beheerpagina");
    stap("geen console- of CSP-fouten (dus ook geen inline CSS)");
    await context.close();
  }

  /* ------------------------------------------------------------------ desktop */
  console.log("Beheer op desktop");
  {
    const nu = Date.now();
    const zaad = {
      ...ZAAD,
      groepen: { a: { naam: "KSA", aantal: 40, t: 1 }, b: { naam: "KLJ", aantal: 25, t: 2 }, c: { naam: "Scouts Merchtem", aantal: 55, t: 3 } },
      kaart: { k1: { naam: "Pils", prijs: 1, punten: 1, telt: true, v: 0 }, k2: { naam: "Streekbier", prijs: 2, punten: 2, telt: true, v: 1 } },
      bestellingen: {
        o1: { groep: "c", groepNaam: "Scouts Merchtem", items: { k1: { naam: "Pils", aantal: 4 } }, bonnetjes: 4, punten: 4, t: nu - 60000, door: "beheer@test.be" },
        o2: { groep: "a", groepNaam: "KSA", items: { k2: { naam: "Streekbier", aantal: 2 }, k1: { naam: "Pils", aantal: 1 } }, bonnetjes: 5, punten: 5, t: nu - 600000, door: "beheer@test.be" },
        o3: { groep: "b", groepNaam: "KLJ", items: { k1: { naam: "Pils", aantal: 3 } }, bonnetjes: 3, punten: 3, t: nu - 900000, door: "beheer@test.be", geannuleerd: true },
      },
    };
    for (const schema of ["light", "dark"]) {
      const { pagina, problemen, context } = await nieuwePagina({ viewport: { width: 1440, height: 900 }, colorScheme: schema }, { zaad, gebruiker: { email: "beheer@test.be", uid: "u1" } });
      await pagina.goto(`${basis}/admin.html`);
      await pagina.waitForSelector(".kpis");
      await pagina.waitForTimeout(700);
      for (const id of ["overzicht", "kassa", "bestellingen", "groepen", "kaart", "instellingen"]) {
        await pagina.click(`#tab-${id}`);
        if (id === "kassa") await pagina.click(".tegel:has-text('KSA')");
        await pagina.waitForTimeout(250);
        await pagina.screenshot({ path: `${UITVOER}d-${schema}-${id}.png` });
      }
      assert.deepEqual(problemen, [], "console- of CSP-fouten op desktop");
      await context.close();
    }
    const { pagina, context } = await nieuwePagina({ viewport: { width: 1440, height: 900 }, colorScheme: "light" }, {});
    await pagina.goto(`${basis}/admin.html`);
    await pagina.waitForSelector("#inlogformulier");
    await pagina.screenshot({ path: UITVOER + "d-inloggen.png" });
    await context.close();
    stap("desktop-weergaven (licht en donker) zonder fouten");

    const mobiel = await nieuwePagina({ viewport: { width: 390, height: 844 }, colorScheme: "light" }, { zaad, gebruiker: { email: "beheer@test.be", uid: "u1" } });
    await mobiel.pagina.goto(`${basis}/admin.html`);
    await mobiel.pagina.waitForSelector(".kpis");
    await mobiel.pagina.waitForTimeout(700);
    for (const id of ["overzicht", "bestellingen", "groepen", "kaart"]) {
      await mobiel.pagina.click(`#tab-${id}`);
      await mobiel.pagina.waitForTimeout(250);
      await mobiel.pagina.screenshot({ path: `${UITVOER}m-${id}.png` });
    }
    assert.deepEqual(mobiel.problemen, [], "console- of CSP-fouten op gsm");
    await mobiel.context.close();
    stap("gsm-weergaven zonder fouten");
  }

  /* ------------------------------------------------------------------ beamer */
  console.log("Beamer");
  {
    const zaad = {
      ...ZAAD,
      instellingen: { ...ZAAD.instellingen, weergave: "grafiek" },
      groepen: { a: { naam: "KSA", aantal: 40, t: 1 }, b: { naam: "KLJ", aantal: 25, t: 2 }, c: { naam: "Scouts", aantal: 55, t: 3 }, d: { naam: "Chiro", aantal: 0, t: 4 } },
      gifs: { b: PIXEL_GIF },
    };
    const { pagina, problemen, context } = await nieuwePagina({ viewport: { width: 1440, height: 810 } }, { zaad });
    await pagina.goto(`${basis}/index.html`);
    await pagina.waitForSelector(".kolom");
    await pagina.waitForTimeout(1200);
    await pagina.screenshot({ path: UITVOER + "11-beamer.png" });

    const volgorde = await pagina.$$eval(".kolom", (k) => k.sort((x, y) => x.style.getPropertyValue("--rang") - y.style.getPropertyValue("--rang")).map((e) => e.querySelector(".kolom__naam").textContent));
    assert.deepEqual(volgorde, ["Scouts", "KSA", "KLJ", "Chiro"]);
    assert.equal(await pagina.textContent("#totaal"), "120");
    assert.equal(await pagina.textContent("#titel"), "Klassement");
    assert.equal(await pagina.textContent("#evenement"), "Quiz Jeugdhuis");
    assert.equal((await pagina.$$(".kolom--leider")).length, 1);
    stap("rangschikking, totaal, titel, evenementnaam en één leider");

    // KLJ krijgt punten: gif verschijnt, KLJ passeert KSA
    await pagina.evaluate(() => import("https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js").then((m) => m.update(m.ref(null), { "groepen/b/aantal": m.increment(20) })));
    await pagina.waitForSelector("#gif:not([hidden])");
    assert.match(await pagina.textContent(".gif__onderschrift"), /KLJ\s*\+20/);
    await pagina.waitForTimeout(700);
    await pagina.screenshot({ path: UITVOER + "12-beamer-gif.png" });
    stap("gif met naam en punten bij een score");

    await pagina.waitForSelector("#gif", { state: "hidden", timeout: 8000 });
    const nieuweVolgorde = await pagina.$$eval(".kolom", (k) => k.sort((x, y) => x.style.getPropertyValue("--rang") - y.style.getPropertyValue("--rang")).map((e) => e.querySelector(".kolom__naam").textContent));
    assert.deepEqual(nieuweVolgorde, ["Scouts", "KLJ", "KSA", "Chiro"]);
    stap("gif verdwijnt vanzelf; KLJ is naar plaats 2 geschoven");

    assert.deepEqual(problemen, [], "console- of CSP-fouten op de beamer");
    stap("geen console- of CSP-fouten");
    await context.close();
  }

  /* ------------------------------------------------------------------ eetbeker en veel teams */
  console.log("Beheer: eetbeker, zoeken en automatisch nummeren");
  {
    const teams = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`g${i}`, { naam: `Team ${i + 1}`, aantal: 0, eten: 0, t: i }]));
    const zaad = {
      ...ZAAD,
      instellingen: { ...ZAAD.instellingen, woord: "team", modus: "bonnetjes" },
      groepen: teams,
      kaart: { k1: { naam: "Pils", prijs: 1, punten: 1, telt: true, v: 0 }, k2: { naam: "Warme hapjes", prijs: 3, punten: 3, telt: true, blad: "eten", v: 1 } },
    };
    const { pagina, problemen, context } = await nieuwePagina({ viewport: { width: 1280, height: 900 } }, { zaad, gebruiker: { email: "beheer@test.be", uid: "u1" } });
    await pagina.goto(`${basis}/admin.html#kassa`);
    await pagina.waitForSelector(".kassa-zoek");
    await pagina.fill(".kassa-zoek input", "team 11");
    assert.equal(await pagina.$$eval(".tegel:not([hidden])", (t) => t.length), 1);
    await pagina.click(".tegel:not([hidden])");
    await pagina.waitForSelector(".kassa-kop");
    await pagina.click(".tegel:has-text('Pils')");
    await pagina.click(".tegel:has-text('Pils')");
    await pagina.click(".tegel:has-text('Warme hapjes')");
    assert.match(await pagina.textContent(".mand__punten"), /\+2 punten · \+3 eetpunten voor Team 11/);
    await pagina.screenshot({ path: UITVOER + "30-kassa-eten.png" });
    await pagina.click("text=Afrekenen");
    await pagina.waitForTimeout(400);
    let b = await boom(pagina);
    assert.equal(b.groepen.g10.aantal, 2);
    assert.equal(b.groepen.g10.eten, 3);
    const bestelling = Object.values(b.bestellingen)[0];
    assert.equal(bestelling.punten, 2);
    assert.equal(bestelling.eten, 3);
    stap("bestelling met drank en eten: drankpunten en eetpunten apart bijgeschreven");

    await pagina.click("#tab-bestellingen");
    await pagina.click("tbody tr button:has-text('Annuleer')");
    await pagina.click("dialog[open] button[value=ok]");
    await pagina.waitForTimeout(400);
    b = await boom(pagina);
    assert.equal(b.groepen.g10.aantal, 0);
    assert.equal(b.groepen.g10.eten, 0);
    stap("annuleren haalt drank- en eetpunten terug");

    await pagina.click("#tab-groepen");
    await pagina.click("summary:has-text('automatisch nummeren')");
    await pagina.fill(".uitklap__inhoud input[type=number]", "15");
    await pagina.click("button:has-text('Aanmaken')");
    await pagina.waitForTimeout(400);
    b = await boom(pagina);
    assert.equal(Object.keys(b.groepen).length, 15);
    stap("automatisch nummeren maakt enkel de ontbrekende teams aan (12 + 3 = 15)");

    await pagina.click("#tab-kaart");
    await pagina.click(".segment__optie:has-text('Eten')");
    await pagina.waitForSelector("text=Eten toevoegen");
    await pagina.screenshot({ path: UITVOER + "31-kaart-eten.png" });
    await pagina.click("#tab-instellingen");
    await pagina.click(".segment__optie:has-text('Per consumptie')");
    await pagina.waitForTimeout(300);
    assert.equal((await boom(pagina)).instellingen.modus, "consumptie");
    await pagina.click(".segment__optie:has-text('Wisselend')");
    await pagina.waitForTimeout(300);
    assert.equal((await boom(pagina)).instellingen.beker, "wissel");
    await pagina.screenshot({ path: UITVOER + "32-instellingen.png" });
    stap("weging en beamer-opties worden opgeslagen");
    assert.deepEqual(problemen, [], "console- of CSP-fouten in beheer");
    await context.close();
  }

  /* ------------------------------------------------------------------ beamer: lijst */
  console.log("Beamer als dynamische lijst");
  {
    const veel = Object.fromEntries(Array.from({ length: 34 }, (_, i) => [`g${i}`, { naam: `Team ${i + 1}`, aantal: (34 - i) * 2, eten: i * 3, t: i }]));
    const zaad = { ...ZAAD, instellingen: { ...ZAAD.instellingen, weergave: "lijst", perPagina: 10, wisselSec: 0, beker: "drank" }, groepen: veel, gifs: { g1: PIXEL_GIF } };
    const { pagina, problemen, context } = await nieuwePagina({ viewport: { width: 1920, height: 1080 } }, { zaad });
    await pagina.goto(`${basis}/index.html`);
    await pagina.waitForSelector(".rij");
    await pagina.waitForTimeout(1300);
    const zichtbaar = () => pagina.$$eval(".rij:not(.rij--weg) .rij__naam", (e) => e.map((x) => x.textContent));
    await pagina.screenshot({ path: UITVOER + "20-lijst-pagina1.png" });

    let namen = await zichtbaar();
    assert.equal(namen.length, 10);
    assert.equal(namen[0], "Team 1");
    assert.equal(await pagina.textContent("#status"), "plaats 1–10 van 34");
    stap("34 teams: pagina 1 toont 10 rijen, status klopt");

    await pagina.click("#bladVolgende");
    await pagina.waitForTimeout(1200);
    namen = await zichtbaar();
    assert.equal(namen[0], "Team 11");
    assert.equal(await pagina.textContent("#status"), "plaats 11–20 van 34");
    await pagina.screenshot({ path: UITVOER + "21-lijst-pagina2.png" });
    stap("doorklikken naar pagina 2");

    await pagina.keyboard.press("ArrowLeft");
    await pagina.waitForTimeout(300);
    assert.equal((await zichtbaar())[0], "Team 1");
    stap("pijltje links gaat terug");

    await pagina.click("#bladAlles");
    await pagina.waitForTimeout(1300);
    assert.equal((await zichtbaar()).length, 34);
    assert.equal(await pagina.$eval("#lijst", (e) => e.style.getPropertyValue("--kolommen")), "3");
    await pagina.screenshot({ path: UITVOER + "22-lijst-alles.png" });
    stap("alles tonen: 34 teams in 3 kolommen");

    await pagina.click("#bladAlles");
    await pagina.waitForTimeout(300);
    assert.equal((await zichtbaar()).length, 10);

    // Team 2 krijgt veel punten en passeert Team 1; de rij springt naar plek 0
    await pagina.evaluate(() => import("https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js").then((m) => m.update(m.ref(null), { "groepen/g1/aantal": m.increment(10) })));
    await pagina.waitForSelector("#gif:not([hidden])");
    await pagina.waitForSelector("#gif", { state: "hidden", timeout: 8000 });
    const plek = (naam) => pagina.$$eval(".rij", (rijen, n) => Number(rijen.find((r) => r.querySelector(".rij__naam").textContent === n).style.getPropertyValue("--rij")), naam);
    assert.equal(await plek("Team 2"), 0);
    assert.equal(await plek("Team 1"), 1);
    stap("Team 2 haalt Team 1 in en springt naar plek 1; gif speelt");

    assert.deepEqual(problemen, [], "console- of CSP-fouten in de lijst");
    await context.close();

    // Eetbeker en wisselen tussen bekers
    const zaad2 = { ...ZAAD, instellingen: { ...ZAAD.instellingen, weergave: "lijst", perPagina: 10, wisselSec: 0, beker: "wissel" }, groepen: { a: { naam: "KSA", aantal: 9, eten: 1, t: 1 }, b: { naam: "KLJ", aantal: 4, eten: 8, t: 2 } } };
    const e = await nieuwePagina({ viewport: { width: 1440, height: 810 } }, { zaad: zaad2 });
    await e.pagina.goto(`${basis}/index.html`);
    await e.pagina.waitForSelector(".rij");
    assert.equal(await e.pagina.textContent("#status"), "Drankbeker");
    await e.pagina.click("#bladVolgende");
    await e.pagina.waitForTimeout(1000);
    assert.equal(await e.pagina.textContent("#status"), "Eetbeker");
    const bovenste = () => e.pagina.$$eval(".rij:not(.rij--weg)", (r) => r.find((x) => x.style.getPropertyValue("--rij") === "0").querySelector(".rij__naam").textContent);
    assert.equal(await bovenste(), "KLJ");
    assert.equal(await e.pagina.textContent("#totaal"), "9");
    await e.pagina.screenshot({ path: UITVOER + "23-eetbeker.png" });
    stap("beker wisselt van drank naar eten met eigen klassement en totaal");
    assert.deepEqual(e.problemen, []);
    await e.context.close();
  }

  console.log("\nAlle e2e-tests geslaagd. Schermafbeeldingen staan in tests/e2e/uitvoer/");
} catch (fout) {
  mislukt = true;
  console.error("\n✗ e2e-test mislukt:\n", fout);
} finally {
  await browser.close();
  server.close();
}
process.exit(mislukt ? 1 : 0);
