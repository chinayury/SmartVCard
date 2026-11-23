import test from "node:test";
import assert from "node:assert/strict";

import {
	LIBRARY_LIMIT,
	makeEntryId,
	makeEntryLabel,
	readLibrary,
	removeEntry,
	renameEntry,
	sanitizeLibrary,
	upsertEntry,
	type LibraryEntry,
} from "../src/lib/cardLibrary.ts";
import { emptyVCard } from "../src/lib/schema.ts";

function entry(overrides: Partial<LibraryEntry> = {}): LibraryEntry {
	return {
		id: overrides.id ?? makeEntryId(),
		savedAt: overrides.savedAt ?? 1700000000000,
		label: overrides.label ?? "林志远",
		draft: { ...emptyVCard, firstName: "志远", lastName: "林" },
		logo: overrides.logo ?? "",
	};
}

test("entry ids are unique", () => {
	const ids = new Set(Array.from({ length: 100 }, () => makeEntryId()));
	assert.equal(ids.size, 100);
});

test("the label derives from the name with a fallback", () => {
	assert.equal(makeEntryLabel({ ...emptyVCard, firstName: "志远", lastName: "林" }), "林志远");
	assert.equal(makeEntryLabel({ ...emptyVCard }), "未命名名片");
});

test("upsert inserts new entries at the head and caps the list", () => {
	let list: LibraryEntry[] = [];
	for (let index = 0; index < LIBRARY_LIMIT + 3; index++) {
		list = upsertEntry(list, entry({ id: `c_${index}`, label: `卡${index}` }));
	}
	assert.equal(list.length, LIBRARY_LIMIT);
	assert.equal(list[0].label, "卡22", "newest first");
	assert.equal(list.some((item) => item.label === "卡0"), false, "oldest evicted");
});

test("upsert updates an entry with the same label in place", () => {
	const first = entry({ id: "c_1", label: "林志远" });
	const updated = { ...entry({ id: "c_2", label: "林志远" }), savedAt: 1800000000000 };
	const list = upsertEntry(upsertEntry([], first), updated);
	assert.equal(list.length, 1, "same label updates instead of duplicating");
	assert.equal(list[0].id, "c_2");
	assert.equal(list[0].savedAt, 1800000000000);
});

test("removeEntry drops only the matching id", () => {
	const list = [entry({ id: "c_1", label: "甲" }), entry({ id: "c_2", label: "乙" })];
	const next = removeEntry(list, "c_1");
	assert.equal(next.length, 1);
	assert.equal(next[0].label, "乙");
	assert.equal(removeEntry(next, "missing").length, 1);
});

test("renameEntry renames, trims, caps and falls back for empty labels", () => {
	const list = [entry({ id: "c_1", label: "旧名" }), entry({ id: "c_2", label: "保持" })];
	const renamed = renameEntry(list, "c_1", "  新名  ");
	assert.equal(renamed[0].label, "新名");
	assert.equal(renamed[1].label, "保持", "other entries untouched");
	const empty = renameEntry(list, "c_1", "   ");
	assert.equal(empty[0].label, "未命名名片", "blank label falls back");
	const capped = renameEntry(list, "c_1", "长".repeat(500));
	assert.equal(capped[0].label.length, 120);
	assert.equal(renameEntry(list, "missing", "x")[0].label, "旧名", "unknown id is a no-op");
});

test("sanitizeLibrary strips junk, dedupes, caps and sanitises drafts", () => {
	const raw = [
		{
			id: "c_1",
			label: "  有效条目  ",
			savedAt: 1700000000000,
			draft: { firstName: "志远", note: "x".repeat(5000), evil: "junk" },
			logo: "data:image/png;base64,AAAA",
		},
		{ id: "c_1", label: "重复应剔除" },
		{ id: "", label: "无 id 剔除" },
		"junk",
		{
			id: "c_2",
			draft: { firstName: "坏 logo" },
			logo: "javascript:alert(1)",
		},
	];
	const list = sanitizeLibrary(raw);
	assert.equal(list.length, 2, "junk and duplicates removed");
	const first = list[0];
	assert.equal(first.label, "有效条目");
	assert.equal(first.draft.note.length, 1000, "note capped at its limit");
	assert.equal((first.draft as unknown as Record<string, unknown>).evil, undefined);
	assert.equal(first.logo, "data:image/png;base64,AAAA");
	const second = list[1];
	assert.equal(second.draft.firstName, "坏 logo");
	assert.equal(second.logo, "", "hostile logo dropped");
	assert.ok(second.label.length > 0, "missing label falls back to the name");
});

test("readLibrary never throws on corrupt storage payloads", () => {
	assert.deepEqual(readLibrary(), []);
});

test("a hostile label is length-capped", () => {
	const list = sanitizeLibrary([{ id: "c_1", label: "长".repeat(500) }]);
	assert.equal(list[0].label.length, 120);
});
