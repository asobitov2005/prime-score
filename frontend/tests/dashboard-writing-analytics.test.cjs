const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

function loadServerMeModule(mockPayload) {
  const filename = path.join(__dirname, "../lib/server-me.ts");
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;

  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));

  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "@/lib/date-time") {
      return {
        formatDate: (value) => value,
        formatDateTime: (value) => value,
      };
    }
    if (request === "@/lib/server-user-auth") {
      return {
        requestServerUserApi: async (path) => {
          if (path === "/me/analytics") {
            return mockPayload;
          }
          throw new Error(`Unexpected path: ${path}`);
        },
      };
    }
    return originalLoad(request, parent, isMain);
  };

  try {
    mod._compile(compiled, filename);
  } finally {
    Module._load = originalLoad;
  }

  return mod.exports;
}

test("server dashboard analytics preserves writing metrics", async () => {
  const payload = {
    performance_summary: {
      study_time: {
        total_time_sec: 7200,
        reading_time_sec: 1800,
        listening_time_sec: 1200,
        writing_time_sec: 4200,
      },
      reading: { full_count: 1, section_1_count: 0, section_2_count: 0, section_3_count: 0, section_4_count: 0 },
      listening: { full_count: 1, section_1_count: 0, section_2_count: 0, section_3_count: 0, section_4_count: 0 },
      writing: { full_count: 3, section_1_count: 2, section_2_count: 1, section_3_count: 0, section_4_count: 0 },
    },
    writing_criteria: {
      task_achievement: 6.5,
      coherence_cohesion: 6.0,
      lexical_resource: 6.5,
      grammatical_range_accuracy: 6.0,
    },
    question_type_analysis: [],
    comparison: {
      previous_test_title: null,
      previous_test_date: null,
      current_test_title: null,
      current_test_date: null,
      tests: [],
      items: [],
    },
    error_distribution: [],
    progress_series: [
      {
        label: "10 May",
        occurred_at: "2026-05-10T01:12:00Z",
        reading: null,
        listening: null,
        writing: 6.5,
      },
    ],
    accuracy_trend: [],
    weekly_activity: [],
    score_distribution: {
      band_1_to_3: 0,
      band_3_5_to_5: 0,
      band_5_to_6_5: 1,
      band_6_5_to_7_5: 2,
      band_7_5_to_9: 0,
    },
    personal_bests: {
      best_band: 7.0,
      best_accuracy: 88,
      longest_streak: 4,
      current_streak: 2,
      fastest_full_test_sec: 3600,
    },
    speed_metrics: {
      avg_time_per_question_sec: 90,
      reading_avg_sec_per_question: 70,
      listening_avg_sec_per_question: 65,
    },
    improvement_rate: {
      last_5_avg_band: 6.5,
      prev_5_avg_band: 6.0,
      delta: 0.5,
      percent_change: 8.3,
    },
  };

  const serverMe = loadServerMeModule(payload);
  const analytics = await serverMe.getDashboardAnalytics();

  assert.equal(analytics.performanceSummary.studyTime.writingTimeSec, 4200);
  assert.equal(analytics.performanceSummary.writing.fullCount, 3);
  assert.equal(analytics.performanceSummary.writing.section1Count, 2);
  assert.equal(analytics.performanceSummary.writing.section2Count, 1);
  assert.equal(analytics.progressSeries[0].writing, 6.5);
  assert.deepEqual(analytics.writingCriteria, {
    taskAchievement: 6.5,
    coherenceCohesion: 6.0,
    lexicalResource: 6.5,
    grammaticalRangeAccuracy: 6.0,
  });
});
