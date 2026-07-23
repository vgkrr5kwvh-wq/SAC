import assert from "node:assert/strict";
import test from "node:test";
import { studentTools } from "../lib/student-hub/registry";
import { buildStudentHubStructuredData } from "../lib/student-hub/structured-data";

test("defines the five Student Hub tools in display order", () => {
  assert.equal(studentTools.length, 5);
  assert.deepEqual(studentTools.map((tool) => tool.order), [1, 2, 3, 4, 5]);
  assert.equal(new Set(studentTools.map((tool) => tool.id)).size, studentTools.length);
  assert.equal(new Set(studentTools.map((tool) => tool.href)).size, studentTools.length);
});

test("marks University Finder as first to launch and other tools as coming soon", () => {
  const [universityFinder, ...remainingTools] = studentTools;
  assert.equal(universityFinder.id, "university-finder");
  assert.equal(universityFinder.status, "launching-first");
  assert.ok(remainingTools.every((tool) => tool.status === "coming-soon"));
});

test("builds CollectionPage and ItemList structured data from the registry", () => {
  const result = buildStudentHubStructuredData(studentTools);
  assert.equal(result["@type"], "CollectionPage");
  assert.equal(result.mainEntity["@type"], "ItemList");
  assert.equal(result.mainEntity.numberOfItems, studentTools.length);
  assert.deepEqual(result.mainEntity.itemListElement.map((item) => item.name), studentTools.map((tool) => tool.title));
});
