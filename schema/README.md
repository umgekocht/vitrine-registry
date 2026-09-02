# `registry/schema/` — `vitrine.json`-Schema v1

Diese Datei ist die **einzige** Quelle der Wahrheit fuer den Aufbau des
Vitrine-Paketmanifests (`vitrine.json`, liegt in jedem `.vpkg`-ZIP). Charter-
Regel 8: "Ein Schema, zwei Seiten." Sowohl der Designer (`designer/`, D2) als
auch der Java-Parser im Mod (`mod/`, P1) validieren dieselbe Datei
[`vitrine.schema.json`](vitrine.schema.json) — es gibt kein zweites,
abweichendes Format.

## Draft-Version

**JSON Schema Draft 2020-12** (`$schema:
"https://json-schema.org/draft/2020-12/schema"`). Grund: aktuellste breit
unterstuetzte Draft-Version, unterstuetzt von Ajv (JS/Designer-Seite) und von
gaengigen Java-Implementierungen (z. B. `networknt/json-schema-validator`,
das explizit `Version.V202012` kennt — Auswahl der konkreten Bibliothek ist
Sache von P1s Java-Parser).

**Kein Netzzugriff zur Validierung.** Die `$id` ist eine `urn:`-Kennung
(`urn:vitrine:schema:vitrine-manifest:v1`), keine `http(s)://`-Adresse — es
gibt keine `$ref` auf eine externe URL. Das Schema ist eine einzelne
in-sich-geschlossene Datei. Charter-Regel 10: der Client braucht zum Lesen
keinen Token, kein Netz.

## Pflichtfelder

| Feld | Typ | Bedeutung |
|---|---|---|
| `schemaVersion` | integer, `const 1` | Version dieses Schemas selbst. |
| `id` | string | Eindeutiger Namespace-Bezeichner, z. B. `"autor.paketname"` (mind. zwei Punkt-Segmente, Kleinbuchstaben/Ziffern/Bindestrich). |
| `name` | string | Anzeigename im Store. |
| `version` | string | SemVer 2.0.0, z. B. `"1.0.0"`. |
| `category` | enum | Eine von: `texturen`, `theme`, `hud`, `shader`, `sound`, `sprache`, `cosmetics`, `bundle` (siehe `ROADMAP.md`/`ASSETS-NEEDED.md`). |
| `author` | string | Name/Handle des Autors. |

## Optionale Felder

`description`, `capabilities` (Faehigkeiten-Whitelist nach Charter-Regel 4 —
wird erst mit P5 ausgewertet, das Schema traegt das Feld aber schon),
`icon`, `screenshots` (relative Pfade innerhalb des `.vpkg`-ZIPs, kein `..`,
kein absoluter Pfad), `homepage` (nur `https://`), `license`.

Die Wurzelebene hat `additionalProperties: false` — ein unbekanntes Feld
(Tippfehler, veraltetes Feld) faellt beim Validieren sofort auf.

## Beispiele

- [`examples/valid/`](examples/valid/) — zwei gueltige Manifeste (minimal und
  mit allen optionalen Feldern).
- [`examples/invalid/`](examples/invalid/) — zwoelf ungueltige Manifeste,
  jedes mit genau einer anderen Fehlerart (fehlendes Pflichtfeld, falscher
  Typ, unbekanntes Zusatzfeld, ungueltiger Enum-Wert, ungueltiges SemVer,
  ungueltiges ID-Muster, leerer Pflichttext, `capabilities` falscher Typ,
  `capabilities`-Eintrag mit ungueltigem Muster, falscher `schemaVersion`-
  Wert, Pfad-Ausbruchsversuch in `icon`, mehrere fehlende Pflichtfelder
  gleichzeitig). P1s "Fertig"-Kriterium auf der Java-Seite verlangt zehn
  fehlerhafte Manifeste mit je eigener Fehlermeldung — diese zwoelf Dateien
  liefern die Testgrundlage dafuer (zwei mehr als das Minimum).

## Lokale Validierung (JS-Referenzimplementierung)

```
cd registry
npm install
npm run validate-examples
```

[`validate-examples.mjs`](validate-examples.mjs) prueft alle Dateien unter
`examples/valid/` als gueltig und alle unter `examples/invalid/` als
ungueltig (`@cfworker/json-schema`, MIT-lizenziert, ohne eigene
Laufzeit-Abhaengigkeiten, siehe `THIRD-PARTY.md` -- bewusst nicht Ajv, weil
dessen `fast-uri`-Abhaengigkeit BSD-3-Clause ist und damit gegen
Charter-Regel 5 verstoesst). Das ist die Referenzimplementierung fuer den
Designer (D2) — kein eigenstaendiges zweites Schema, nur eine andere
Bibliothek, die dieselbe Datei liest.

## Fuer die Mod-Seite (P1, Java-Parser)

Der Java-Parser validiert gegen exakt dieselbe Datei
`registry/schema/vitrine.schema.json` (z. B. per
`networknt/json-schema-validator` o. ae., MIT/Apache-lizenziert, Lizenz vor
Aufnahme an der Quelle pruefen und in `mod/`s eigene Abhaengigkeitsliste
eintragen). Die zwoelf Dateien unter `examples/invalid/` sind die Grundlage
fuer die zehn geforderten Fehlerfaelle aus P1s "Fertig"-Kriterium — jede
Datei verletzt genau eine Regel, damit der Parser eine eigene, praezise
Fehlermeldung je Fall ausgeben kann statt einer generischen "ungueltig"-
Meldung.
