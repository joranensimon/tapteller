import { test } from "node:test";
import assert from "node:assert/strict";
import { aandeel, bestellingRegels, bestellingTotaal, puntenVoor, rangschik, rond } from "../../assets/js/lib/puntentelling.js";

const kaart = {
  pils: { naam: "Pils", prijs: 1, punten: 1, telt: true },
  duvel: { naam: "Duvel", prijs: 2, punten: 3, telt: true },
  water: { naam: "Water", prijs: 1, punten: 0, telt: false },
  half: { naam: "Proefglas", prijs: 0.5, punten: 0.5, telt: true },
};

test("bonnetjes-modus: punten = bonnetjes", () => {
  assert.equal(puntenVoor(kaart.duvel, 2, "bonnetjes"), 4);
});

test("zuipbeker-modus: eigen puntenwaarde, standaard 1", () => {
  assert.equal(puntenVoor(kaart.duvel, 2, "zuipbeker"), 6);
  assert.equal(puntenVoor({ naam: "X", prijs: 5 }, 3, "zuipbeker"), 3);
});

test("dranken die niet meetellen geven nooit punten", () => {
  assert.equal(puntenVoor(kaart.water, 5, "bonnetjes"), 0);
  assert.equal(puntenVoor(kaart.water, 5, "zuipbeker"), 0);
});

test("onbekende drank geeft 0 punten", () => {
  assert.equal(puntenVoor(undefined, 2, "bonnetjes"), 0);
});

test("totaal telt bonnetjes altijd, ook voor dranken die niet meetellen", () => {
  const t = bestellingTotaal({ pils: 3, water: 2, duvel: 1 }, kaart, "bonnetjes");
  assert.deepEqual(t, { bonnetjes: 7, punten: 5, eten: 0 });
});

test("totaal in zuipbeker-modus", () => {
  const t = bestellingTotaal({ pils: 3, water: 2, duvel: 1 }, kaart, "zuipbeker");
  assert.deepEqual(t, { bonnetjes: 7, punten: 6, eten: 0 });
});

test("totaal negeert verwijderde dranken en nulaantallen", () => {
  const t = bestellingTotaal({ pils: 0, weg: 4, duvel: 1 }, kaart, "bonnetjes");
  assert.deepEqual(t, { bonnetjes: 2, punten: 2, eten: 0 });
});

test("halve bonnetjes geven geen drijvende-kommafouten", () => {
  const t = bestellingTotaal({ half: 3, pils: 1 }, { ...kaart }, "bonnetjes");
  assert.equal(t.bonnetjes, 2.5);
  assert.equal(rond(0.1 + 0.2), 0.3);
});

test("bestellingRegels bewaart naam, prijs en punten van dat moment", () => {
  const r = bestellingRegels({ duvel: 2, water: 1 }, kaart, "zuipbeker");
  assert.deepEqual(r.duvel, { naam: "Duvel", aantal: 2, prijs: 2, punten: 6 });
  assert.deepEqual(r.water, { naam: "Water", aantal: 1, prijs: 1, punten: 0 });
});

test("rangschikking: hoog naar laag, gelijke stand alfabetisch", () => {
  const lijst = rangschik({ a: { naam: "Scouts", aantal: 5 }, b: { naam: "KSA", aantal: 9 }, c: { naam: "KLJ", aantal: 5 } });
  assert.deepEqual(lijst.map((g) => g.naam), ["KSA", "KLJ", "Scouts"]);
});

test("rangschikking verdraagt ontbrekende gegevens", () => {
  assert.deepEqual(rangschik(null), []);
  assert.equal(rangschik({ a: {} })[0].aantal, 0);
  assert.equal(rangschik({ a: {} })[0].naam, "?");
});

test("aandeel: verhouding tegenover de hoogste score, begrensd tussen 0 en 100", () => {
  assert.equal(aandeel(5, 10), 50);
  assert.equal(aandeel(10, 10), 100);
  assert.equal(aandeel(0, 0), 0);
  assert.equal(aandeel(-3, 10), 0);
});

test("modus consumptie: elke consumptie is 1 punt, ongeacht de prijs", () => {
  assert.equal(puntenVoor(kaart.duvel, 2, "consumptie"), 2);
  assert.equal(puntenVoor(kaart.pils, 3, "consumptie"), 3);
  assert.equal(puntenVoor(kaart.water, 3, "consumptie"), 0);
});

test("eten gaat naar de eetbeker en telt niet bij de drankbeker", () => {
  const eten = { naam: "Warme hapjes", prijs: 3, punten: 3, telt: true, blad: "eten" };
  const k = { h: eten, p: { naam: "Pils", prijs: 1, telt: true } };
  assert.deepEqual(bestellingTotaal({ h: 2, p: 2 }, k, "bonnetjes"), { bonnetjes: 8, punten: 2, eten: 6 });
  assert.deepEqual(bestellingTotaal({ h: 2, p: 2 }, k, "consumptie"), { bonnetjes: 8, punten: 2, eten: 2 });
});

test("eten dat niet meetelt geeft geen eetpunten", () => {
  const water = { naam: "Chips", prijs: 1, telt: false, blad: "eten" };
  assert.deepEqual(bestellingTotaal({ c: 4 }, { c: water }, "bonnetjes"), { bonnetjes: 4, punten: 0, eten: 0 });
});

test("bestellingRegels markeert eten", () => {
  const r = bestellingRegels({ h: 1 }, { h: { naam: "Hapjes", prijs: 3, blad: "eten" } }, "bonnetjes");
  assert.equal(r.h.blad, "eten");
});

test("rangschikken op eetbeker gebruikt het veld eten", () => {
  const lijst = rangschik({ a: { naam: "A", aantal: 9, eten: 1 }, b: { naam: "B", aantal: 2, eten: 6 } }, "eten");
  assert.deepEqual(lijst.map((g) => [g.naam, g.aantal]), [["B", 6], ["A", 1]]);
});
