"use client";

import { TestCatalogItem, TestType, getTestSourceLabel } from "./latest-tests-panel-dependencies";
import { getTestCreatedTime, latestSkillOrder } from "./latest-tests-panel-part-01";

export function getBalancedLatestTests(tests: TestCatalogItem[], limit: number) {
  const testsBySkill = new Map<TestType, TestCatalogItem[]>();

  for (const skill of latestSkillOrder) {
    testsBySkill.set(skill, []);
  }

  for (const test of tests) {
    testsBySkill.get(test.type)?.push(test);
  }

  for (const skillTests of testsBySkill.values()) {
    skillTests.sort((first, second) => getTestCreatedTime(second) - getTestCreatedTime(first));
  }

  const selected = new Map<string, TestCatalogItem>();

  for (const skill of latestSkillOrder) {
    const latestSkillTest = testsBySkill.get(skill)?.[0];

    if (latestSkillTest) {
      selected.set(latestSkillTest.id, latestSkillTest);
    }
  }

  const remainingLatestTests = [...tests]
    .filter((test) => !selected.has(test.id))
    .sort((first, second) => getTestCreatedTime(second) - getTestCreatedTime(first));

  for (const test of remainingLatestTests) {
    if (selected.size >= limit) {
      break;
    }

    selected.set(test.id, test);
  }

  return [...selected.values()]
    .sort((first, second) => getTestCreatedTime(second) - getTestCreatedTime(first))
    .slice(0, limit);
}

export function getTestBookmarkItem(test: TestCatalogItem) {
  return {
    id: test.id,
    slug: test.slug,
    title: test.title,
    type: test.type,
    format: test.format,
    accessType: test.accessType,
    source: test.source,
    sourceLabel: getTestSourceLabel(test.source),
    description: test.description,
    questionCount: test.questionCount,
    estimatedMinutes: test.estimatedMinutes,
    href: test.type === "writing" ? "/writing" : `/tests/${test.slug || test.id}`,
    actionLabel: test.accessType === "premium" ? "Unlock" : "Open Test",
  };
}
