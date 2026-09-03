# `registry/` — Vitrine-Katalog: Format und Index-Builder (M4/K1)

Charter-Regel 8: „Ein Schema, zwei Seiten." Die Dateien unter
[`schema/`](schema/) sind die einzige Quelle der Wahrheit fuer das
Katalog-Format. Der Index-Builder hier (`build-index.js`) schreibt genau
dieses Format, der Katalog-Client im Mod (`mod/`, K2) liest spaeter
dieselben Dateien — es gibt kein zweites, abweichendes Format.

Dieser Ordner enthaelt zwei getrennte Dinge:

- Das **Paketmanifest-Schema** (`vitrine.json`, liegt in jedem `.vpkg`) unter
  [`schema/vitrine.schema.json`](schema/vitrine.schema.json) — siehe
  [`schema/README.md`](schema/README.md).
- Das **Registry-Format** (dieser Katalog, `packages/`, `index/`,
  `search.json`, `featured.json`) — beschrieben unten. Beide Formate teilen
  sich `id`, `category`, `version`/`versions[].version`, sind aber
  eigenstaendige Schemas: das Registry-Format transportiert zusaetzlich
  Download-URL, Pruefsumme und Signatur, die im `.vpkg` selbst nicht stehen.

## Registry-Format

Vier Dateiarten, live spaeter im separaten Repo `vitrine-registry`
(GitHub Pages/raw, kein Backend — siehe `ROADMAP.md`, Technische
Festlegungen):

| Datei | Schema | Inhalt |
|---|---|---|
| `packages/<id>.json` | [`schema/registry-package.schema.json`](schema/registry-package.schema.json) | Ein Eintrag pro veroeffentlichtem Paket: Metadaten, Autor, Kategorie, alle Versionen mit Download-URL, SHA-256, ed25519-Signatur. Von Autoren per PR gepflegt (K6). |
| `index/index.json`, `index/index-2.json`, ... | [`schema/registry-index-page.schema.json`](schema/registry-index-page.schema.json) | Paginierte Liste aller Pakete (Kurzeintraege), erzeugt vom Builder. Seite 1 heisst `index.json`, jede weitere `index-<n>.json`. |
| `search.json` | [`schema/registry-search.schema.json`](schema/registry-search.schema.json) | Flache, nicht paginierte Liste mit Suchfeldern (Stichworte), erzeugt vom Builder. |
| `featured.json` | [`schema/registry-featured.schema.json`](schema/registry-featured.schema.json) | Kuratierte Auswahl, aus dem optionalen `featured`-Feld je Paketeintrag erzeugt. |

`packages/<id>.json` ist die **Quelle**, die anderen drei sind **generiert**
— nie von Hand pflegen, immer per `build-index.js` neu bauen.

## Index-Builder

```
cd registry
npm install
node build-index.js --packages packages --out .
```

Ohne Argumente liest der Builder `registry/packages/` und schreibt nach
`registry/index/`, `registry/search.json`, `registry/featured.json`
(relativ zum Skript). Optionen: `--page-size N` (Standard 24), `--now ISO`
(fuer reproduzierbare Laeufe, z. B. in CI — sonst `new Date().toISOString()`).

Der Builder prueft jede `packages/<id>.json` gegen
`registry-package.schema.json`, gegen den Dateinamen (muss `<id>.json`
heissen), auf doppelte `id`s und darauf, dass `latestVersion` tatsaechlich
die hoechste in `versions` gelistete SemVer-Version ist. Ein einziger
kaputter Eintrag bricht den ganzen Lauf ab (Exit-Code 1) — kein halber Index.

## Beispielpakete

[`packages/`](packages/) enthaelt drei Beispielpakete (Klasse-A-Inhalte:
Textur, Theme, HUD) als Fixtures fuer Builder-Test und Dokumentation:

- `spassglas.steinbrocken-textur` (Kategorie `texturen`, zwei Versionen, kuratiert)
- `spassglas.mitternacht-theme` (Kategorie `theme`, kuratiert)
- `spassglas.kompakt-hud` (Kategorie `hud`, mit `minVitrineVersion`)

## Test

```
cd registry
npm test
```

[`test/build-index.test.mjs`](test/build-index.test.mjs) laesst den Builder
gegen die drei Beispielpakete laufen (in ein temporaeres Verzeichnis, nicht
nach `registry/index/`) und prueft jede erzeugte Datei mit
`@cfworker/json-schema` gegen ihr Schema — dieselbe Bibliothek wie
`schema/validate-examples.mjs` (MIT, siehe `THIRD-PARTY.md`). Zusaetzlich:
Paginierung bei kleiner `--page-size` ueber mehrere Seiten, und Ablehnung
eines Registry-Pakets, das sein Schema verletzt.

## Fuer die Mod-Seite (K2, Katalog-Client)

Der Katalog-Client laedt `index/index.json` (und folgt bei Bedarf
`nextPage`), optional `search.json` fuer die Store-Suche und `featured.json`
fuer die Startseite — per HTTPS-GET gegen eine Host-Whitelist, mit Timeout
und Groessenlimit (K2s eigenes „Fertig"-Kriterium). Alle drei Dateien sind
in sich geschlossen (keine `$ref` auf externe URLs, keine weiteren
Nachlade-Schritte ausser der Pagination selbst).
