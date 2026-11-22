import test from "node:test";
import assert from "node:assert/strict";

import {
	BACKUP_KIND,
	BACKUP_VERSION,
	buildBackupFile,
	backupFilename,
	MAX_BACKUP_BYTES,
	parseBackupFile,
} from "../src/lib/backup.ts";
import { emptyVCard } from "../src/lib/schema.ts";
import { DEFAULT_SETTINGS } from "../src/lib/settings.ts";
import type { LibraryEntry } from "../src/lib/cardLibrary.ts";

const LIBRARY: LibraryEntry[] = [
	{
		id: "c_1",
		savedAt: 1700000000000,
		label: "备份库条目",
		draft: { ...emptyVCard, firstName: "甲" },
		logo: "data:image/png;base64,AAAA",
	},
];

const DRAFT = {
	...emptyVCard,
	firstName: "志远",
	lastName: "林",
	organization: "示例科技",
	cellPhone: "+86 138 0013 8000",
	note: "备份轮实测 🚀",
};

const LOGO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==";

test("a backup round-trips draft, logo, settings and the library", () => {
	const file = buildBackupFile(DRAFT, LOGO, { ...DEFAULT_SETTINGS, mode: "vcard", size: 2048 }, LIBRARY);
	const parsed = parseBackupFile(file);
	assert.ok(parsed);
	assert.equal(parsed.draft.firstName, "志远");
	assert.equal(parsed.draft.lastName, "林");
	assert.equal(parsed.draft.note, "备份轮实测 🚀");
	assert.equal(parsed.logo, LOGO);
	assert.equal(parsed.settings.mode, "vcard");
	assert.equal(parsed.settings.size, 2048);
	// The logo never rides the draft — it has its own field.
	assert.equal(parsed.draft.logoUrl, "");
	assert.deepEqual(parsed.library, LIBRARY);
});

test("a version-1 backup (no library) still imports, keeping the current library", () => {
	const v1 = JSON.stringify({
		app: "Smart VCard",
		kind: BACKUP_KIND,
		version: 1,
		exportedAt: "2026-11-01T00:00:00.000Z",
		data: { draft: DRAFT, logo: LOGO, settings: DEFAULT_SETTINGS },
	});
	const parsed = parseBackupFile(v1);
	assert.ok(parsed, "version 1 files stay importable");
	assert.equal(parsed.draft.firstName, "志远");
	assert.deepEqual(parsed.library, []);
});

test("a hostile library inside the backup is sanitised", () => {
	const v2 = JSON.stringify({
		app: "Smart VCard",
		kind: BACKUP_KIND,
		version: BACKUP_VERSION,
		data: {
			draft: DRAFT,
			logo: "",
			library: [
				{ id: "c_1", label: "条目", savedAt: 1, draft: { firstName: "甲" }, logo: "javascript:alert(1)" },
				"junk",
				{ id: "c_2", label: "正常", draft: { firstName: "乙" }, logo: "" },
			],
		},
	});
	const parsed = parseBackupFile(v2);
	assert.ok(parsed);
	assert.equal(parsed.library.length, 2, "junk entries dropped");
	assert.equal(parsed.library[0].logo, "", "hostile logo dropped");
	assert.equal(parsed.library[1].draft.firstName, "乙");
});

test("the backup document carries app, kind, version and a timestamp", () => {
	const file = buildBackupFile(DRAFT, LOGO, DEFAULT_SETTINGS);
	const doc = JSON.parse(file) as Record<string, unknown>;
	assert.equal(doc.app, "Smart VCard");
	assert.equal(doc.kind, BACKUP_KIND);
	assert.equal(doc.version, BACKUP_VERSION);
	assert.ok(typeof doc.exportedAt === "string" && !Number.isNaN(Date.parse(doc.exportedAt)));
});

test("unknown keys and over-limit values from a hand-edited file are stripped", () => {
	const hostile = JSON.stringify({
		app: "Smart VCard",
		kind: BACKUP_KIND,
		version: BACKUP_VERSION,
		data: {
			draft: { ...DRAFT, evil: "x", __proto__: { polluted: true }, note: "长".repeat(4000) },
			logo: LOGO,
		},
	});
	const parsed = parseBackupFile(hostile);
	assert.ok(parsed);
	assert.equal((parsed.draft as unknown as Record<string, unknown>).evil, undefined);
	assert.equal(({} as Record<string, unknown>).polluted, undefined);
	assert.ok(parsed.draft.note.length <= 1000, "note capped at its schema limit");
});

test("junk logos are dropped, not carried", () => {
	const file = buildBackupFile(DRAFT, "javascript:alert(1)", DEFAULT_SETTINGS);
	const parsed = parseBackupFile(file);
	assert.ok(parsed);
	assert.equal(parsed.logo, "");
	const handEdited = JSON.stringify({
		app: "Smart VCard",
		kind: BACKUP_KIND,
		version: BACKUP_VERSION,
		data: { draft: DRAFT, logo: "data:text/html;base64,AAAA" },
	});
	const parsed2 = parseBackupFile(handEdited);
	assert.ok(parsed2);
	assert.equal(parsed2.logo, "");
});

test("wrong kind, wrong version and malformed documents are rejected", () => {
	const wrap = (data: Record<string, unknown>, overrides: Record<string, unknown> = {}) =>
		JSON.stringify({ app: "Smart VCard", kind: BACKUP_KIND, version: BACKUP_VERSION, data, ...overrides });
	assert.equal(parseBackupFile(wrap({ draft: DRAFT }, { kind: "something-else" })), null);
	assert.equal(parseBackupFile(wrap({ draft: DRAFT }, { version: 99 })), null);
	assert.equal(parseBackupFile(wrap({ draft: DRAFT }, { version: "1" })), null);
	assert.equal(parseBackupFile(wrap({ draft: DRAFT }, { data: "text" })), null);
	assert.equal(parseBackupFile("not json"), null);
	assert.equal(parseBackupFile(""), null);
	assert.equal(parseBackupFile(JSON.stringify([])), null);
	assert.equal(parseBackupFile("a".repeat(MAX_BACKUP_BYTES + 1)), null);
});

test("backup filename carries a date stamp and no path characters", () => {
	const name = backupFilename(new Date(2026, 10, 15));
	assert.equal(name, "SmartVCard-Backup-20261115.json");
	assert.ok(!name.includes("/") && !name.includes("\\"));
});
