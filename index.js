import Parser from "rss-parser";
import { writeFile, mkdir } from "fs/promises";

/**
 * Elenco delle fonti da aggregare.
 * Aggiungi/rimuovi/modifica sezioni qui: è l'unico posto che serve toccare
 * quando cambia una sezione della Polisportiva.
 */
const SOURCES = [
  {
    id: "basket-carrozzina",
    label: "Basket in Carrozzina",
    feedUrl: "https://www.sslaziobasketincarrozzina.it/feed/",
  },
  {
    id: "calcio-a-5",
    label: "Calcio a 5",
    feedUrl: "https://www.sslaziocalcioa5.it/feed/",
  },
  {
    id: "football-americano",
    label: "Football Americano",
    feedUrl: "https://www.laziofootball.com/feed/",
  },
  {
    id: "hockey",
    label: "Hockey su Prato",
    feedUrl: "https://www.laziohockey.it/feed/",
  },
  {
    id: "padel",
    label: "Padel",
    feedUrl: "https://www.sslaziopadel.it/feed/",
  },
  {
    id: "nuoto",
    label: "Pallanuoto / Nuoto",
    feedUrl: "https://www.sslazionuoto.it/feed/",
  },
  {
    id: "rugby",
    label: "Rugby",
    feedUrl: "https://laziorugby.it/feed/",
  },
  // Beach Soccer usa Joomla e non espone un feed RSS di default.
  // Vedi README.md per le opzioni per includerlo comunque.
];

// Quante notizie tenere per fonte come massimo (evita che una sola sezione
// molto attiva riempia tutto il bundle)
const MAX_PER_SOURCE = 15;
// Quante notizie totali tenere nel bundle finale
const MAX_TOTAL = 60;

const parser = new Parser({
  timeout: 15000,
  headers: { "User-Agent": "PolisportivaLazioNewsBot/1.0" },
});

async function fetchSource(source) {
  try {
    const feed = await parser.parseURL(source.feedUrl);
    const items = (feed.items || []).slice(0, MAX_PER_SOURCE).map((item) => ({
      title: item.title?.trim() ?? "(senza titolo)",
      link: item.link,
      source: source.id,
      sourceLabel: source.label,
      pubDate: item.isoDate || item.pubDate || null,
      // Un piccolo estratto, ripulito dall'HTML, utile per l'anteprima in app
      snippet: (item.contentSnippet || "").slice(0, 220),
    }));
    console.log(`✔ ${source.label}: ${items.length} notizie`);
    return items;
  } catch (err) {
    console.error(`✘ ${source.label} (${source.feedUrl}): ${err.message}`);
    return [];
  }
}

async function main() {
  const results = await Promise.all(SOURCES.map(fetchSource));
  let allItems = results.flat();

  // Ordina dalla più recente alla più remota
  allItems.sort((a, b) => {
    const dateA = a.pubDate ? new Date(a.pubDate).getTime() : 0;
    const dateB = b.pubDate ? new Date(b.pubDate).getTime() : 0;
    return dateB - dateA;
  });

  allItems = allItems.slice(0, MAX_TOTAL);

  const output = {
    generatedAt: new Date().toISOString(),
    count: allItems.length,
    items: allItems,
  };

  await mkdir("docs", { recursive: true });
  await writeFile("docs/notizie.json", JSON.stringify(output, null, 2), "utf-8");

  console.log(`\nBundle creato: docs/notizie.json (${allItems.length} notizie totali)`);
}

main().catch((err) => {
  console.error("Errore fatale:", err);
  process.exit(1);
});
