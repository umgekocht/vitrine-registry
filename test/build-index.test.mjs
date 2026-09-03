// Test fuer registry/build-index.js (M4/K1).
//
// Laesst den Builder gegen die drei Beispielpakete unter registry/packages/
// laufen (Textur, Theme, HUD -- Klasse-A-Inhalte) und prueft jede erzeugte
// Datei gegen ihr Schema unter registry/schema/. Schreibt in ein temporaeres
// Verzeichnis, nicht nach registry/index/ -- der Builder-Output ist kein
// eingecheckter Zustand dieses Repos (das Katalog-Repo 'vitrine-registry'
// entsteht erst in K7).
//
// Aufruf: node --test registry/test/build-index.test.mjs
// (vorher einmalig: npm install --prefix registry)

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Validator } from "@cfworker/json-schema";
import { buildIndex } from "../build-index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const registryRoot = path.join(here, "..");
const packagesDir = path.join(registryRoot, "packages");
const schemaDir = path.join(registryRoot, "schema");

function loadSchema(name) {
	return JSON.parse(readFileSync(path.join(schemaDir, name), "utf8"));
}

function validateOrThrow(validator, data, label) {
	const result = validator.validate(data);
	if (!result.valid) {
		throw new Error(`${label} verletzt sein Schema:\n${JSON.stringify(result.errors, null, 2)}`);
	}
}

test("Builder erzeugt aus den 3 Beispielpaketen einen gueltigen, paginierten Index", async (t) => {
	const outDir = mkdtempSync(path.join(tmpdir(), "vitrine-registry-test-"));
	t.after(() => rmSync(outDir, { recursive: true, force: true }));

	const now = "2026-09-03T00:00:00.000Z";
	const result = buildIndex({ packagesDir, outDir, pageSize: 24, now });

	await t.test("liest genau 3 Beispielpakete", () => {
		assert.equal(result.packages.length, 3);
		assert.deepEqual(
			result.packages.map((p) => p.id),
			["spassglas.kompakt-hud", "spassglas.mitternacht-theme", "spassglas.steinbrocken-textur"],
		);
	});

	await t.test("index/index.json ist die einzige Seite (3 Pakete < pageSize) und gueltig", () => {
		assert.equal(result.pages.length, 1);
		const page = result.pages[0];
		assert.equal(page.fileName, "index.json");
		assert.equal(page.content.totalCount, 3);
		assert.equal(page.content.totalPages, 1);
		assert.equal(page.content.nextPage, null);
		assert.equal(page.content.previousPage, null);
		assert.equal(page.content.packages.length, 3);

		const validator = new Validator(loadSchema("registry-index-page.schema.json"), "2020-12");
		validateOrThrow(validator, page.content, "index/index.json");

		const onDisk = JSON.parse(readFileSync(path.join(outDir, "index", "index.json"), "utf8"));
		assert.deepEqual(onDisk, page.content);
	});

	await t.test("search.json ist gueltig und enthaelt alle 3 Pakete", () => {
		const validator = new Validator(loadSchema("registry-search.schema.json"), "2020-12");
		validateOrThrow(validator, result.search, "search.json");
		assert.equal(result.search.entries.length, 3);
		assert.ok(result.search.entries.every((e) => e.keywords.length > 0));

		const onDisk = JSON.parse(readFileSync(path.join(outDir, "search.json"), "utf8"));
		assert.deepEqual(onDisk, result.search);
	});

	await t.test("featured.json ist gueltig und enthaelt die 2 kuratierten Pakete in order-Reihenfolge", () => {
		const validator = new Validator(loadSchema("registry-featured.schema.json"), "2020-12");
		validateOrThrow(validator, result.featured, "featured.json");
		assert.deepEqual(
			result.featured.items.map((i) => i.id),
			["spassglas.steinbrocken-textur", "spassglas.mitternacht-theme"],
		);

		const onDisk = JSON.parse(readFileSync(path.join(outDir, "featured.json"), "utf8"));
		assert.deepEqual(onDisk, result.featured);
	});
});

test("Builder paginiert bei kleiner pageSize ueber mehrere Seiten", async (t) => {
	const outDir = mkdtempSync(path.join(tmpdir(), "vitrine-registry-test-page-"));
	t.after(() => rmSync(outDir, { recursive: true, force: true }));

	const now = "2026-09-03T00:00:00.000Z";
	const result = buildIndex({ packagesDir, outDir, pageSize: 1, now });
	const pageSchema = loadSchema("registry-index-page.schema.json");
	const validator = new Validator(pageSchema, "2020-12");

	assert.equal(result.pages.length, 3);
	for (const page of result.pages) {
		validateOrThrow(validator, page.content, page.fileName);
	}

	assert.equal(result.pages[0].fileName, "index.json");
	assert.equal(result.pages[0].content.nextPage, "index-2.json");
	assert.equal(result.pages[0].content.previousPage, null);

	assert.equal(result.pages[1].fileName, "index-2.json");
	assert.equal(result.pages[1].content.nextPage, "index-3.json");
	assert.equal(result.pages[1].content.previousPage, "index.json");

	assert.equal(result.pages[2].fileName, "index-3.json");
	assert.equal(result.pages[2].content.nextPage, null);
	assert.equal(result.pages[2].content.previousPage, "index-2.json");
});

test("Builder lehnt ein Registry-Paket ab, das sein Schema verletzt", async (t) => {
	const badPackagesDir = mkdtempSync(path.join(tmpdir(), "vitrine-registry-bad-packages-"));
	t.after(() => rmSync(badPackagesDir, { recursive: true, force: true }));

	const outDir = mkdtempSync(path.join(tmpdir(), "vitrine-registry-bad-out-"));
	t.after(() => rmSync(outDir, { recursive: true, force: true }));

	const fs = await import("node:fs");
	fs.writeFileSync(
		path.join(badPackagesDir, "kaputt.paket.json"),
		JSON.stringify({ schemaVersion: 1, id: "kaputt.paket" }),
	);

	assert.throws(() => buildIndex({ packagesDir: badPackagesDir, outDir }), /verletzt registry-package\.schema\.json/);
});
