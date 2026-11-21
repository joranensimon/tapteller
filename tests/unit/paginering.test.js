import { test } from "node:test";
import assert from "node:assert/strict";
import { indeling, maakDias, plaatsBereik, vorige, volgende } from "../../assets/js/lib/paginering.js";

test("pagina's: 34 groepen, 10 per pagina → 4 pagina's", () => {
  assert.deepEqual(indeling({ totaal: 34, perPagina: 10 }), { kolommen: 1, rijen: 10, perBlad: 10, paginas: 4 });
});

test("weinig groepen: minstens 4 rijen zodat rijen niet te groot worden", () => {
  assert.equal(indeling({ totaal: 2, perPagina: 10 }).rijen, 4);
  assert.equal(indeling({ totaal: 6, perPagina: 10 }).rijen, 6);
  assert.equal(indeling({ totaal: 0, perPagina: 10 }).paginas, 1);
});

test("alles tegelijk: meerdere kolommen vanaf 13 groepen, nooit meer dan 4", () => {
  assert.deepEqual(indeling({ totaal: 10, perPagina: 10, alles: true }), { kolommen: 1, rijen: 10, perBlad: 10, paginas: 1 });
  assert.deepEqual(indeling({ totaal: 30, perPagina: 5, alles: true }), { kolommen: 3, rijen: 10, perBlad: 30, paginas: 1 });
  assert.equal(indeling({ totaal: 200, perPagina: 0 }).kolommen, 4);
  assert.equal(indeling({ totaal: 14, perPagina: 0 }).kolommen, 2);
});

test("alle groepen passen altijd op het scherm in alles-modus", () => {
  for (const totaal of [1, 5, 12, 13, 25, 48, 90]) {
    const { perBlad } = indeling({ totaal, perPagina: 0 });
    assert.ok(perBlad >= totaal, `${totaal} groepen`);
  }
});

test("dia's: eerst alle pagina's van de eerste beker", () => {
  assert.deepEqual(maakDias(["drank", "eten"], 2), [
    { beker: "drank", pagina: 0 }, { beker: "drank", pagina: 1 },
    { beker: "eten", pagina: 0 }, { beker: "eten", pagina: 1 },
  ]);
});

test("volgende en vorige lopen rond", () => {
  assert.equal(volgende(3, 4), 0);
  assert.equal(vorige(0, 4), 3);
  assert.equal(volgende(0, 0), 0);
});

test("plaatsbereik", () => {
  assert.equal(plaatsBereik(1, { perBlad: 10 }, 34), "plaats 11–20 van 34");
  assert.equal(plaatsBereik(3, { perBlad: 10 }, 34), "plaats 31–34 van 34");
  assert.equal(plaatsBereik(0, { perBlad: 1 }, 5), "plaats 1 van 5");
});
