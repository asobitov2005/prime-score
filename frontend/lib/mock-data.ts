import type {
  AttemptMode,
  AttemptRow,
  AttemptWorkspaceMeta,
  DashboardStat,
  LeaderboardEntry,
  ListeningPart,
  ReadingPassage,
  TestCatalogItem,
  TestQuestion,
  TestQuestionGroup,
  TestScope,
  TestSectionSummary
} from "@/lib/types";


function group(id: string, title: string, type: TestQuestionGroup["type"], questions: TestQuestion[]): TestQuestionGroup {
  return {
    id,
    title,
    type,
    questionStart: questions[0]?.number ?? 0,
    questionEnd: questions[questions.length - 1]?.number ?? 0,
    questions
  };
}


function question(input: TestQuestion): TestQuestion {
  return input;
}


function buildReadingPassage(
  id: string,
  title: string,
  subtitle: string,
  content: string,
  paragraphs: string[],
  questionGroups: TestQuestionGroup[]
): ReadingPassage {
  return {
    id,
    title,
    subtitle,
    content,
    paragraphs,
    questionGroups,
    questions: questionGroups.flatMap((item) => item.questions)
  };
}


function buildListeningPart(
  id: string,
  title: string,
  subtitle: string,
  transcriptSummary: string,
  audioDurationSeconds: number,
  segments: ListeningPart["segments"],
  questionGroups: TestQuestionGroup[]
): ListeningPart {
  return {
    id,
    title,
    subtitle,
    transcriptSummary,
    segments,
    questionGroups,
    questions: questionGroups.flatMap((item) => item.questions),
    audioDurationSeconds
  };
}


const readingPassagesBySection: Record<string, ReadingPassage> = {
  p1: buildReadingPassage(
    "p1",
    "Passage 1: Urban Air Quality",
    "Questions 1-13",
    "The first modern city air-quality campaign began with a simple observation: citizens were spending more time indoors, but the air inside apartment blocks often contained the same pollutants found on the street. Researchers responded by measuring particulate matter in schools, homes, and transit hubs, then comparing those readings against outdoor baselines.",
    [
      "Paragraph A describes how initial measurements were gathered from schools and apartments.",
      "Paragraph B explains why ventilation standards became a policy concern.",
      "Paragraph C discusses the cost of retrofitting older buildings.",
      "Paragraph D concludes with a public-health recommendation."
    ],
    [
      group("rg-1", "Questions 1-5", "reading_true_false_not_given", [
        question({
          id: "rq-1",
          number: 1,
          type: "reading_true_false_not_given",
          prompt: "The writer states that indoor air was always cleaner than outdoor air.",
          instructions: "Choose TRUE, FALSE, or NOT GIVEN.",
          options: [
            { id: "true", label: "True" },
            { id: "false", label: "False" },
            { id: "ng", label: "Not Given" }
          ],
          sectionId: "p1",
          sectionTitle: "Passage 1",
          groupId: "rg-1",
          groupTitle: "Questions 1-5"
        }),
        question({
          id: "rq-2",
          number: 2,
          type: "reading_true_false_not_given",
          prompt: "Schools were among the first buildings monitored by researchers.",
          instructions: "Choose TRUE, FALSE, or NOT GIVEN.",
          options: [
            { id: "true", label: "True" },
            { id: "false", label: "False" },
            { id: "ng", label: "Not Given" }
          ],
          sectionId: "p1",
          sectionTitle: "Passage 1",
          groupId: "rg-1",
          groupTitle: "Questions 1-5"
        }),
        question({
          id: "rq-3",
          number: 3,
          type: "reading_true_false_not_given",
          prompt: "The study directly measured pollution in underground rail stations.",
          instructions: "Choose TRUE, FALSE, or NOT GIVEN.",
          options: [
            { id: "true", label: "True" },
            { id: "false", label: "False" },
            { id: "ng", label: "Not Given" }
          ],
          sectionId: "p1",
          sectionTitle: "Passage 1",
          groupId: "rg-1",
          groupTitle: "Questions 1-5"
        })
      ]),
      group("rg-2", "Questions 6-9", "reading_matching_headings", [
        question({
          id: "rq-6",
          number: 6,
          type: "reading_matching_headings",
          prompt: "Paragraph A",
          instructions: "Choose the correct heading.",
          options: [
            { id: "i", label: "i. Early baseline measurements" },
            { id: "ii", label: "ii. Hidden maintenance costs" },
            { id: "iii", label: "iii. Public pressure campaign" },
            { id: "iv", label: "iv. Ventilation as policy" }
          ],
          sectionId: "p1",
          sectionTitle: "Passage 1",
          groupId: "rg-2",
          groupTitle: "Questions 6-9"
        }),
        question({
          id: "rq-7",
          number: 7,
          type: "reading_matching_headings",
          prompt: "Paragraph B",
          instructions: "Choose the correct heading.",
          options: [
            { id: "i", label: "i. Early baseline measurements" },
            { id: "ii", label: "ii. Hidden maintenance costs" },
            { id: "iii", label: "iii. Public pressure campaign" },
            { id: "iv", label: "iv. Ventilation as policy" }
          ],
          sectionId: "p1",
          sectionTitle: "Passage 1",
          groupId: "rg-2",
          groupTitle: "Questions 6-9"
        })
      ]),
      group("rg-3", "Questions 10-13", "reading_sentence_completion", [
        question({
          id: "rq-10",
          number: 10,
          type: "reading_sentence_completion",
          prompt: "The most common indoor pollutant came from {{10}} systems.",
          instructions: "Write NO MORE THAN TWO WORDS.",
          answerSlots: 1,
          sectionId: "p1",
          sectionTitle: "Passage 1",
          groupId: "rg-3",
          groupTitle: "Questions 10-13"
        }),
        question({
          id: "rq-11",
          number: 11,
          type: "reading_sentence_completion",
          prompt: "The team compared indoor measurements with outdoor {{11}}.",
          instructions: "Write NO MORE THAN TWO WORDS.",
          answerSlots: 1,
          sectionId: "p1",
          sectionTitle: "Passage 1",
          groupId: "rg-3",
          groupTitle: "Questions 10-13"
        })
      ])
    ]
  ),
  p2: buildReadingPassage(
    "p2",
    "Passage 2: Battery Recycling",
    "Questions 14-26",
    "Commercial battery recycling scaled slowly because collection networks were fragmented. Producers, local councils, and waste processors each tracked different metrics, which made national planning uneven.",
    [
      "Paragraph A introduces the fragmented collection network.",
      "Paragraph B examines the economics of transport and storage.",
      "Paragraph C covers the role of local policy incentives.",
      "Paragraph D describes how standardisation improved recovery rates."
    ],
    [
      group("rg-4", "Questions 14-20", "reading_mc_single", [
        question({
          id: "rq-14",
          number: 14,
          type: "reading_mc_single",
          prompt: "Why did early battery recycling expand slowly?",
          options: [
            { id: "a", label: "Collection networks were fragmented." },
            { id: "b", label: "Households refused to participate." },
            { id: "c", label: "No metal could be recovered." },
            { id: "d", label: "Imports were banned." }
          ],
          sectionId: "p2",
          sectionTitle: "Passage 2",
          groupId: "rg-4",
          groupTitle: "Questions 14-20"
        }),
        question({
          id: "rq-15",
          number: 15,
          type: "reading_mc_single",
          prompt: "Which factor improved long-distance transport efficiency?",
          options: [
            { id: "a", label: "Larger depot spacing" },
            { id: "b", label: "Uniform packaging standards" },
            { id: "c", label: "Lower metal purity" },
            { id: "d", label: "Seasonal export bans" }
          ],
          sectionId: "p2",
          sectionTitle: "Passage 2",
          groupId: "rg-4",
          groupTitle: "Questions 14-20"
        })
      ]),
      group("rg-5", "Questions 21-26", "reading_short_answer", [
        question({
          id: "rq-21",
          number: 21,
          type: "reading_short_answer",
          prompt: "Which organisation created the national reporting template?",
          instructions: "Write NO MORE THAN THREE WORDS.",
          answerSlots: 1,
          sectionId: "p2",
          sectionTitle: "Passage 2",
          groupId: "rg-5",
          groupTitle: "Questions 21-26"
        })
      ])
    ]
  ),
  p3: buildReadingPassage(
    "p3",
    "Passage 3: AI and Expert Judgement",
    "Questions 27-40",
    "Decision support systems improved consistency in several sectors, but the strongest outcomes came from teams that paired machine ranking with expert override and structured review after each cycle.",
    [
      "Paragraph A contrasts prediction quality with human intuition.",
      "Paragraph B explains why override logs mattered.",
      "Paragraph C compares sectors that adopted review loops.",
      "Paragraph D summarises the long-term governance lesson."
    ],
    [
      group("rg-6", "Questions 27-34", "reading_summary_completion_wordbank", [
        question({
          id: "rq-27",
          number: 27,
          type: "reading_summary_completion_wordbank",
          prompt: "Complete the summary. The strongest systems combined {{27}} with expert review.",
          wordBank: ["automation", "ranking", "outsourcing", "storage"],
          sectionId: "p3",
          sectionTitle: "Passage 3",
          groupId: "rg-6",
          groupTitle: "Questions 27-34"
        }),
        question({
          id: "rq-28",
          number: 28,
          type: "reading_summary_completion_wordbank",
          prompt: "Complete the summary. Teams used {{28}} logs to learn from exceptions.",
          wordBank: ["override", "training", "finance", "failure"],
          sectionId: "p3",
          sectionTitle: "Passage 3",
          groupId: "rg-6",
          groupTitle: "Questions 27-34"
        })
      ]),
      group("rg-7", "Questions 35-40", "reading_short_answer", [
        question({
          id: "rq-35",
          number: 35,
          type: "reading_short_answer",
          prompt: "Which process made the combined approach reliable over time?",
          instructions: "Write NO MORE THAN THREE WORDS.",
          answerSlots: 1,
          sectionId: "p3",
          sectionTitle: "Passage 3",
          groupId: "rg-7",
          groupTitle: "Questions 35-40"
        })
      ])
    ]
  )
};

const listeningPartsBySection: Record<string, ListeningPart> = {
  s1: buildListeningPart(
    "s1",
    "Part 1: Campus Housing",
    "Questions 1-10",
    "A student calls the housing office to confirm availability, ask about the deposit, and reserve a room for the next term.",
    420,
    [
      { id: "seg-1", label: "Greeting and availability", startSecond: 0, endSecond: 24 },
      { id: "seg-2", label: "Deposit and documents", startSecond: 24, endSecond: 47 },
      { id: "seg-3", label: "Reservation summary", startSecond: 47, endSecond: 72 }
    ],
    [
      group("lg-1", "Questions 1-5", "listening_form_completion", [
        question({
          id: "lq-1",
          number: 1,
          type: "listening_form_completion",
          prompt: "Complete the booking form. Student name: {{1}}",
          instructions: "Write NO MORE THAN TWO WORDS.",
          answerSlots: 1,
          sectionId: "s1",
          sectionTitle: "Part 1",
          groupId: "lg-1",
          groupTitle: "Questions 1-5"
        }),
        question({
          id: "lq-2",
          number: 2,
          type: "listening_form_completion",
          prompt: "Complete the booking form. Reference number: {{2}}",
          instructions: "Write NO MORE THAN TWO WORDS.",
          answerSlots: 1,
          sectionId: "s1",
          sectionTitle: "Part 1",
          groupId: "lg-1",
          groupTitle: "Questions 1-5"
        })
      ]),
      group("lg-2", "Questions 6-10", "listening_mc_single", [
        question({
          id: "lq-6",
          number: 6,
          type: "listening_mc_single",
          prompt: "What time does the office close on Friday?",
          options: [
            { id: "a", label: "5:00 pm" },
            { id: "b", label: "5:30 pm" },
            { id: "c", label: "6:00 pm" },
            { id: "d", label: "6:30 pm" }
          ],
          sectionId: "s1",
          sectionTitle: "Part 1",
          groupId: "lg-2",
          groupTitle: "Questions 6-10"
        })
      ])
    ]
  ),
  s2: buildListeningPart(
    "s2",
    "Part 2: Museum Guide",
    "Questions 11-20",
    "A guide explains the museum map, highlights the new gallery, and points out visitor rules.",
    420,
    [
      { id: "seg-4", label: "Opening overview", startSecond: 0, endSecond: 30 },
      { id: "seg-5", label: "Map directions", startSecond: 30, endSecond: 68 }
    ],
    [
      group("lg-3", "Questions 11-20", "listening_plan_map_diagram_labeling", [
        question({
          id: "lq-11",
          number: 11,
          type: "listening_plan_map_diagram_labeling",
          prompt: "Label the museum plan. Entrance desk = {{11}}",
          wordBank: ["A", "B", "C", "D", "E"],
          sectionId: "s2",
          sectionTitle: "Part 2",
          groupId: "lg-3",
          groupTitle: "Questions 11-20"
        })
      ])
    ]
  ),
  s3: buildListeningPart(
    "s3",
    "Part 3: Research Discussion",
    "Questions 21-30",
    "Two students discuss survey design with a tutor and compare which indicators should be prioritised.",
    420,
    [
      { id: "seg-6", label: "Initial disagreement", startSecond: 0, endSecond: 34 },
      { id: "seg-7", label: "Tutor feedback", startSecond: 34, endSecond: 72 }
    ],
    [
      group("lg-4", "Questions 21-30", "listening_matching", [
        question({
          id: "lq-21",
          number: 21,
          type: "listening_matching",
          prompt: "Match each student to the main concern they mention.",
          options: [
            { id: "a", label: "Response rate" },
            { id: "b", label: "Travel cost" },
            { id: "c", label: "Question clarity" }
          ],
          sectionId: "s3",
          sectionTitle: "Part 3",
          groupId: "lg-4",
          groupTitle: "Questions 21-30"
        })
      ])
    ]
  ),
  s4: buildListeningPart(
    "s4",
    "Part 4: Wildlife Lecture",
    "Questions 31-40",
    "A lecture covers migration routes, habitat pressure, and how scientists compare seasonal tracking data.",
    420,
    [
      { id: "seg-8", label: "Migration causes", startSecond: 0, endSecond: 42 },
      { id: "seg-9", label: "Tracking methods", startSecond: 42, endSecond: 88 }
    ],
    [
      group("lg-5", "Questions 31-40", "listening_sentence_completion", [
        question({
          id: "lq-31",
          number: 31,
          type: "listening_sentence_completion",
          prompt: "The main tracking device used in the study was a {{31}} tag.",
          instructions: "Write NO MORE THAN TWO WORDS.",
          answerSlots: 1,
          sectionId: "s4",
          sectionTitle: "Part 4",
          groupId: "lg-5",
          groupTitle: "Questions 31-40"
        })
      ])
    ]
  )
};

export const mockTests: TestCatalogItem[] = [
  {
    id: "reading-cam18-t1",
    slug: "cambridge-18-reading-test-1",
    title: "Cambridge 18 Reading Test 1",
    type: "reading",
    format: "full",
    accessType: "public",
    status: "published",
    source: "Cambridge",
    sourceDetail: "Cambridge 18, Test 1",
    questionCount: 40,
    estimatedMinutes: 60,
    isPremiumLocked: false,
    description:
      "Academic Reading with a clean article-science topic mix, strict IELTS timing, and review-friendly structure.",
    tags: ["3 passages", "Practice", "Public"],
    sections: [
      { id: "p1", number: 1, title: "Passage 1", questionCount: 13, teaser: "Vocabulary-heavy research text." },
      { id: "p2", number: 2, title: "Passage 2", questionCount: 13, teaser: "Argument and evidence structure." },
      { id: "p3", number: 3, title: "Passage 3", questionCount: 14, teaser: "Dense academic analysis." }
    ]
  },
  {
    id: "listening-cam18-t2",
    slug: "cambridge-18-listening-test-2",
    title: "Cambridge 18 Listening Test 2",
    type: "listening",
    format: "full",
    accessType: "premium",
    status: "published",
    source: "Cambridge",
    sourceDetail: "Cambridge 18, Test 2",
    questionCount: 40,
    estimatedMinutes: 32,
    isPremiumLocked: true,
    description:
      "A full Listening test with four parts, sticky audio control, and review-time transcript seek placeholders.",
    tags: ["4 parts", "Exam", "Premium"],
    sections: [
      { id: "s1", number: 1, title: "Part 1", questionCount: 10, teaser: "Conversation and form completion." },
      { id: "s2", number: 2, title: "Part 2", questionCount: 10, teaser: "Monologue with map/diagram cues." },
      { id: "s3", number: 3, title: "Part 3", questionCount: 10, teaser: "Discussion with matching tasks." },
      { id: "s4", number: 4, title: "Part 4", questionCount: 10, teaser: "Academic lecture and note completion." }
    ]
  },
  {
    id: "reading-custom-politics",
    slug: "reading-green-energy-policy",
    title: "Reading: Green Energy Policy",
    type: "reading",
    format: "passage_1",
    accessType: "premium",
    status: "draft",
    source: "Custom",
    sourceDetail: "In-house editorial set",
    questionCount: 40,
    estimatedMinutes: 60,
    isPremiumLocked: true,
    description:
      "A draft reading set with test-level unique content, answer variants, and snapshot-ready versioning.",
    tags: ["Draft", "Premium", "Custom"],
    sections: [
      { id: "p1", number: 1, title: "Passage 1", questionCount: 13, teaser: "Climate policy article." },
      { id: "p2", number: 2, title: "Passage 2", questionCount: 13, teaser: "Technology adoption essay." },
      { id: "p3", number: 3, title: "Passage 3", questionCount: 14, teaser: "Policy comparison and inference." }
    ]
  },
  {
    id: "listening-cam17-t1",
    slug: "cambridge-17-listening-test-1",
    title: "Cambridge 17 Listening Test 1",
    type: "listening",
    format: "full",
    accessType: "public",
    status: "published",
    source: "Cambridge Official",
    sourceDetail: "Cambridge 17, Test 1",
    questionCount: 40,
    estimatedMinutes: 30,
    isPremiumLocked: false,
    description:
      "Authentic Cambridge Official listening practice to gauge your real exam readiness.",
    tags: ["4 parts", "Practice", "Cambridge Official"],
    sections: [
      { id: "s1", number: 1, title: "Part 1", questionCount: 10, teaser: "Everyday conversation." },
      { id: "s2", number: 2, title: "Part 2", questionCount: 10, teaser: "Informational monologue." },
      { id: "s3", number: 3, title: "Part 3", questionCount: 10, teaser: "Academic discussion." },
      { id: "s4", number: 4, title: "Part 4", questionCount: 10, teaser: "University lecture." }
    ]
  },
  {
    id: "reading-cam17-t2",
    slug: "cambridge-17-reading-test-2",
    title: "Cambridge 17 Reading Test 2",
    type: "reading",
    format: "passage_2",
    accessType: "public",
    status: "published",
    source: "Cambridge Official",
    sourceDetail: "Cambridge Official",
    questionCount: 40,
    estimatedMinutes: 60,
    isPremiumLocked: false,
    description: "Another official Cambridge reading set.",
    tags: ["Official", "Reading"],
    sections: [{ id: "p1", number: 1, title: "Passage 1", questionCount: 13, teaser: "..." }]
  },
  {
    id: "listening-cam16-t1",
    slug: "cambridge-16-listening-test-1",
    title: "Cambridge 16 Listening Test 1",
    type: "listening",
    format: "part_1",
    accessType: "premium",
    status: "published",
    source: "Cambridge Official",
    sourceDetail: "Cambridge Official",
    questionCount: 40,
    estimatedMinutes: 30,
    isPremiumLocked: true,
    description: "Premium official Cambridge listening set.",
    tags: ["Official", "Listening"],
    sections: [{ id: "s1", number: 1, title: "Part 1", questionCount: 10, teaser: "..." }]
  },
  {
    id: "reading-cam16-t1",
    slug: "cambridge-16-reading-test-1",
    title: "Cambridge 16 Reading Test 1",
    type: "reading",
    format: "passage_3",
    accessType: "premium",
    status: "published",
    source: "Cambridge Official",
    sourceDetail: "Cambridge Official",
    questionCount: 40,
    estimatedMinutes: 60,
    isPremiumLocked: true,
    description: "Premium official Cambridge reading set.",
    tags: ["Official", "Reading"],
    sections: [{ id: "p1", number: 1, title: "Passage 1", questionCount: 13, teaser: "..." }]
  },
  {
    id: "listening-cam15-t1",
    slug: "cambridge-15-listening-test-1",
    title: "Cambridge 15 Listening Test 1",
    type: "listening",
    format: "part_2",
    accessType: "public",
    status: "published",
    source: "Cambridge Official",
    sourceDetail: "Cambridge Official",
    questionCount: 40,
    estimatedMinutes: 30,
    isPremiumLocked: false,
    description: "Public official Cambridge listening set.",
    tags: ["Official", "Listening"],
    sections: [{ id: "s1", number: 1, title: "Part 1", questionCount: 10, teaser: "..." }]
  }
];

export const mockDashboardStats: DashboardStat[] = [
  { label: "Tests taken", value: "23", detail: "Last 30 days" },
  { label: "Avg Band", value: "6.5", detail: "Best 10 attempts" },
  { label: "Best Band", value: "7.5", detail: "Reading practice" },
  { label: "Total Time", value: "14h 32m", detail: "All attempts" }
];

export const mockAttempts: AttemptRow[] = [
  {
    id: "att-001",
    testId: "reading-cam18-t1",
    testTitle: "Cambridge 18 Reading Test 1",
    type: "reading",
    testFormat: "full",
    source: "Cambridge Official",
    mode: "practice",
    date: "2026-04-14",
    lastSavedAt: "14 Apr 2026, 18:42",
    score: "34/40",
    band: "7.5",
    totalQuestions: 40,
    timeSpent: "58:12",
    status: "completed"
  },
  {
    id: "att-002",
    testId: "listening-cam18-t2",
    testTitle: "Cambridge 18 Listening Test 2",
    type: "listening",
    testFormat: "full",
    source: "Cambridge Official",
    mode: "exam",
    date: "2026-04-13",
    lastSavedAt: "13 Apr 2026, 09:18",
    score: "31/40",
    band: "7.0",
    totalQuestions: 40,
    timeSpent: "31:48",
    status: "completed"
  },
  {
    id: "att-003",
    testId: "reading-custom-politics",
    testTitle: "Reading: Green Energy Policy",
    type: "reading",
    testFormat: "full",
    source: "Exam Practice Tests",
    mode: "practice",
    date: "2026-04-12",
    lastSavedAt: "12 Apr 2026, 21:07",
    score: "28/40",
    band: "6.5",
    totalQuestions: 40,
    timeSpent: "46:10",
    status: "submitted"
  }
];

export const mockLeaderboard: LeaderboardEntry[] = [
  { rank: 1, name: "Ali T.", type: "reading", band: "8.5", attempts: 45, readingAttempts: 30, listeningAttempts: 15, totalTime: "28h 15m", qualified: true },
  { rank: 2, name: "Maria K.", type: "listening", band: "8.0", attempts: 38, readingAttempts: 18, listeningAttempts: 20, totalTime: "24h 00m", qualified: true },
  { rank: 3, name: "John D.", type: "combined", band: "8.0", attempts: 52, readingAttempts: 26, listeningAttempts: 26, totalTime: "32h 45m", qualified: true },
  { rank: 4, name: "Sarah L.", type: "reading", band: "7.5", attempts: 31, readingAttempts: 21, listeningAttempts: 10, totalTime: "19h 30m", qualified: true },
  { rank: 5, name: "Michael R.", type: "listening", band: "7.5", attempts: 28, readingAttempts: 10, listeningAttempts: 18, totalTime: "17h 20m", qualified: true },
  { rank: 6, name: "Elena V.", type: "combined", band: "7.5", attempts: 40, readingAttempts: 20, listeningAttempts: 20, totalTime: "25h 10m", qualified: true },
  { rank: 7, name: "Ahmad M.", type: "reading", band: "7.0", attempts: 19, readingAttempts: 15, listeningAttempts: 4, totalTime: "12h 05m", qualified: true },
  { rank: 8, name: "Jessica W.", type: "listening", band: "7.0", attempts: 22, readingAttempts: 8, listeningAttempts: 14, totalTime: "14h 40m", qualified: true },
  { rank: 9, name: "David Chen", type: "combined", band: "7.0", attempts: 35, readingAttempts: 17, listeningAttempts: 18, totalTime: "22h 15m", qualified: true },
  { rank: 10, name: "Fatima S.", type: "reading", band: "7.0", attempts: 27, readingAttempts: 20, listeningAttempts: 7, totalTime: "16h 50m", qualified: true },
  { rank: 42, name: "You", type: "reading", band: "6.5", attempts: 23, readingAttempts: 15, listeningAttempts: 8, totalTime: "14h 32m", qualified: true, isCurrentUser: true }
];

export const mockProgressSeries = [
  { name: "W1", reading: 5.5, listening: 5.0 },
  { name: "W2", reading: 6.0, listening: 5.5 },
  { name: "W3", reading: 6.5, listening: 6.0 },
  { name: "W4", reading: 6.2, listening: 6.5 },
  { name: "W5", reading: 6.8, listening: 6.6 },
  { name: "W6", reading: 7.0, listening: 7.0 }
];

export const mockRadarSeries = [
  { subject: "MC Single", value: 78 },
  { subject: "TFNG", value: 64 },
  { subject: "Matching", value: 70 },
  { subject: "Completion", value: 82 },
  { subject: "Short Answer", value: 68 }
];

export const mockHeatmap = Array.from({ length: 24 }, (_, index) => ({
  month:
    index < 2 ? "Jan" :
    index < 4 ? "Feb" :
    index < 6 ? "Mar" :
    index < 8 ? "Apr" :
    index < 10 ? "May" :
    index < 12 ? "Jun" :
    index < 14 ? "Jul" :
    index < 16 ? "Aug" :
    index < 18 ? "Sep" :
    index < 20 ? "Oct" :
    index < 22 ? "Nov" : "Dec",
  value: [0, 1, 2, 3, 4][index % 5]
}));

export const testTypeLabelMap: Record<string, string> = {
  reading: "Reading",
  listening: "Listening"
};

export function getTestById(id: string): TestCatalogItem | undefined {
  return mockTests.find((test) => test.id === id || test.slug === id);
}

export function getTestsByType(type?: string): TestCatalogItem[] {
  if (!type) {
    return mockTests;
  }

  return mockTests.filter((test) => test.type === type);
}

export function getTestsByAccess(access?: string): TestCatalogItem[] {
  if (!access) {
    return mockTests;
  }

  return mockTests.filter((test) => test.accessType === access);
}

export function getAttemptsByType(type?: string): AttemptRow[] {
  if (!type) {
    return mockAttempts;
  }

  return mockAttempts.filter((attempt) => attempt.type === type);
}

export function getLeaderboardByType(type?: string): LeaderboardEntry[] {
  if (!type || type === "combined") {
    return mockLeaderboard;
  }

  return mockLeaderboard.filter((entry) => entry.type === type || entry.type === "combined" || entry.isCurrentUser);
}

export function getAttemptModeLabel(mode: AttemptMode): string {
  return mode === "practice" ? "Practice" : "Exam";
}

export function getReadingPassage(sectionId: string): ReadingPassage {
  return readingPassagesBySection[sectionId] ?? readingPassagesBySection.p1;
}

export function getListeningPart(sectionId: string): ListeningPart {
  return listeningPartsBySection[sectionId] ?? listeningPartsBySection.s1;
}

export function buildAttemptWorkspaceMeta(
  test: TestCatalogItem,
  scope: TestScope,
  mode: AttemptMode,
  currentSectionId?: string
): AttemptWorkspaceMeta {
  const selectedSection: TestSectionSummary = test.sections.find((section) => section.id === currentSectionId) ?? test.sections[0];
  const totalListeningAudioSeconds = test.type === "listening"
    ? test.sections.reduce((sum, section) => sum + getListeningPart(section.id).audioDurationSeconds, 0)
    : 0;

  const timeLimitSeconds =
    mode === "exam"
      ? test.type === "reading"
        ? 60 * 60
        : totalListeningAudioSeconds + 120
      : scope === "section"
        ? Math.max(300, selectedSection.questionCount * 120)
        : 0;

  return {
    timeLimitSeconds,
    currentSectionId: selectedSection.id,
    currentSectionTitle: selectedSection.title,
    currentSectionQuestionCount: selectedSection.questionCount
  };
}

export interface ReviewItem {
  id: string;
  name: string;
  band: string;
  text: string;
  date: string;
}

export const mockReviews: ReviewItem[] = [
  { id: "r1", name: "Azizbek Y.", band: "7.5", text: "PrimeScore helped me get used to the computer-delivered format. The interface is exactly like the real exam!", date: "2 days ago" },
  { id: "r2", name: "Malika T.", band: "8.0", text: "The detailed analytics showed me that I was losing points on True/False/Not Given questions. Focused practice fixed it.", date: "1 week ago" },
  { id: "r3", name: "Sardor M.", band: "7.0", text: "Audio player for listening tests is perfectly matched with the real IELTS test. Highly recommended.", date: "2 weeks ago" },
  { id: "r4", name: "Dilnoza R.", band: "8.5", text: "I loved the highlight feature in the answer review. It made understanding my mistakes so much easier.", date: "1 month ago" },
  { id: "r5", name: "Javohir O.", band: "7.0", text: "Very smooth interface and accurate scoring. Helped me overcome my time-management issues in Reading.", date: "1 month ago" },
  { id: "r6", name: "Shahnoza A.", band: "7.5", text: "The best platform for CDI IELTS preparation in Uzbekistan. The Premium mock tests are very challenging.", date: "2 months ago" }
];
