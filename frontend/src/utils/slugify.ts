export const normalize = (s: string): string =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const slugify = (s: string): string => normalize(s).replace(/\s+/g, "-");

export const COUNTRY_ALIAS: Record<string, string> = {
  spain: "España",
  germany: "Alemania",
  france: "Francia",
  italy: "Italia",
  "united-kingdom": "Reino Unido",
  netherlands: "Países Bajos",
  belgium: "Bélgica",
  switzerland: "Suiza",
  austria: "Austria",
  poland: "Polonia",
  czechia: "Chequia",
  "czech-republic": "Chequia",
  slovakia: "Eslovaquia",
  hungary: "Hungría",
  slovenia: "Eslovenia",
  croatia: "Croacia",
  greece: "Grecia",
  romania: "Rumanía",
  bulgaria: "Bulgaria",
  lithuania: "Lituania",
  latvia: "Letonia",
  estonia: "Estonia",
  finland: "Finlandia",
  sweden: "Suecia",
  norway: "Noruega",
  iceland: "Islandia",
  ireland: "Irlanda",
  andorra: "Andorra",
  monaco: "Mónaco",
  "san-marino": "San Marino",
  liechtenstein: "Liechtenstein",
  luxembourg: "Luxemburgo",
  malta: "Malta",
  cyprus: "Chipre",
  albania: "Albania",
  serbia: "Serbia",
  montenegro: "Montenegro",
  "north-macedonia": "Macedonia del Norte",
  macedonia: "Macedonia del Norte",
  "bosnia-and-herzegovina": "Bosnia y Herzegovina",
  bosnia: "Bosnia y Herzegovina",
  kosovo: "Kosovo",
  moldova: "Moldavia",
  ukraine: "Ucrania",
  belarus: "Bielorrusia",
};
