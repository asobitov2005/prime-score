const assert = require("node:assert/strict");
const test = require("node:test");
const { loadTypeScript } = require("./helpers/load-typescript.cjs");
const { mockDateParts, mockDuration, mockPageNumbers, mockTimeRange, safeMockLaunch } = loadTypeScript("lib/mock-catalog.ts");

test("mock cards derive date and time range in Tashkent, including UTC day changes", () => {
  const parts = mockDateParts("2026-09-26T20:00:00Z");
  assert.equal(parts.weekday, "Sun");
  assert.equal(parts.month, "Sep");
  assert.equal(parts.day, "27");
  assert.equal(mockTimeRange("2026-09-27T04:00:00Z", 180), "09:00 - 12:00");
  assert.equal(mockTimeRange("2026-09-27T18:00:00Z", 120), "23:00 - 01:00");
});

test("mock duration reflects supplied minutes, never a fixed reference duration", () => {
  assert.equal(mockDuration(165), "2h 45m");
  assert.equal(mockDuration(155), "2h 35m");
  assert.equal(mockDuration(120), "2h");
  assert.equal(mockDuration(45), "45m");
  assert.equal(mockDuration(45.5), "45m 30s");
  assert.equal(mockDuration(null), "Duration not set");
});

test("stage links accept only the matching local component launch protocol", () => {
  const stage = { key: "reading", resource_type: "test", resource_id: "r1", launch_url: "/exam-preview/reading?testId=r1&mode=exam&start=1" };
  assert.equal(safeMockLaunch(stage), stage.launch_url);
  for (const launch_url of ["https://example.com", "//example.com", "javascript:alert(1)", "/exam-preview/reading?testId=other&mode=exam&start=1", "/exam-preview/reading?testId=r1&mode=exam", "/exam-preview/listening?testId=r1&mode=exam&start=1"]) {
    assert.equal(safeMockLaunch({ ...stage, launch_url }), null);
  }
  const writing = { key: "writing_task_1", resource_type: "writing_task", resource_id: "w1", launch_url: "/exam-preview/writing?taskId=w1" };
  assert.equal(safeMockLaunch(writing), writing.launch_url);
  assert.equal(safeMockLaunch({ ...writing, resource_type: "test" }), null);
});

test("pagination keeps a bounded window with reachable first and last pages", () => {
  assert.deepEqual(mockPageNumbers(1, 0), []);
  assert.deepEqual(mockPageNumbers(1, 3), [1, 2, 3]);
  assert.deepEqual(mockPageNumbers(1, 10), [1, 2, 3, 4, 5]);
  assert.deepEqual(mockPageNumbers(5, 10), [3, 4, 5, 6, 7]);
  assert.deepEqual(mockPageNumbers(10, 10), [6, 7, 8, 9, 10]);
});
