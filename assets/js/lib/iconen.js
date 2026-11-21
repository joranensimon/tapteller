/** Eigen iconenset (24×24, lijnstijl). De opmaak staat in componenten/icoon.css. */

const SVG = "http://www.w3.org/2000/svg";

const PADEN = {
  terug: "M15 18l-6-6 6-6",
  omhoog: "M6 15l6-6 6 6",
  omlaag: "M6 9l6 6 6-6",
  sluit: "M6 6l12 12M18 6L6 18",
  plus: "M12 5v14M5 12h14",
  check: "M5 12l5 5 9-10",
  prullenbak: "M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3",
  afbeelding: "M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M9 9h.01",
  download: "M12 4v11M7 11l5 5 5-5M5 20h14",
  uitloggen: "M10 5H5v14h5M15 8l4 4-4 4M19 12H9",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  kopieer: "M9 9h10v11H9zM5 15V4h10",
  ongedaan: "M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-4",
  scherm: "M3 5h18v11H3zM9 20h6M12 16v4",
  overzicht: "M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z",
  kassa: "M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6",
  snel: "M13 3L5 14h6l-1 7 8-11h-6z",
  bestellingen: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  groepen: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.3a3.5 3.5 0 0 1 0 6.4M18 14a6.5 6.5 0 0 1 3.5 6",
  kaart: "M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11M9 8h6",
  instellingen: "M4 7h9M17 7h3M4 17h3M11 17h9M15 4v6M9 14v6",
  extern: "M14 4h6v6M20 4l-9 9M18 14v5H5V6h5",
  zoek: "M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM20 20l-4-4",
};

/** @param {keyof typeof PADEN} naam */
export function icoon(naam) {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("class", "icoon");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");

  const pad = document.createElementNS(SVG, "path");
  pad.setAttribute("d", PADEN[naam]);
  svg.append(pad);
  return svg;
}
