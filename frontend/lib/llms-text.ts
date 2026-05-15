import { absoluteUrl, siteName, siteUrl } from "@/lib/seo";
import { seoLandingPages } from "@/lib/seo-pages";

type LlmLink = {
  title: string;
  path: string;
  description: string;
};

const publicProductLinks: LlmLink[] = [
  {
    title: "Home",
    path: "/",
    description:
      "Canonical overview of PrimeScore, an online IELTS mock platform for Reading, Listening, Writing, and Speaking practice.",
  },
  {
    title: "Pricing",
    path: "/pricing",
    description:
      "Public premium plan comparison for learners who want more IELTS practice, explanations, and writing feedback.",
  },
  {
    title: "Public Tests",
    path: "/tests",
    description:
      "Browsable catalogue of IELTS Reading and Listening mock tests, including public and premium practice items.",
  },
  {
    title: "Reviews",
    path: "/reviews",
    description:
      "Public learner reviews and IELTS band score outcomes shown as social proof for PrimeScore.",
  },
  {
    title: "Login",
    path: "/login",
    description:
      "Telegram-based learner login entry point for saving progress and accessing member features.",
  },
];

const appCapabilityLinks: LlmLink[] = [
  {
    title: "Dashboard",
    path: "/dashboard",
    description:
      "Authenticated learner dashboard with progress, quick test entry points, and practice overview.",
  },
  {
    title: "Writing Practice",
    path: "/writing",
    description:
      "IELTS Writing Task 1 and Task 2 practice, custom prompts, image-based Task 1 support, autosaved drafts, and feedback flow.",
  },
  {
    title: "Writing Tasks",
    path: "/writing/tasks",
    description:
      "Authenticated list of available IELTS Writing tasks for starting or resuming writing practice.",
  },
  {
    title: "Writing History",
    path: "/writing/history",
    description:
      "Authenticated writing submission history and result review area.",
  },
  {
    title: "Speaking Preparation",
    path: "/speaking",
    description:
      "Authenticated IELTS Speaking preparation area. Public speaking SEO page is also available separately.",
  },
  {
    title: "Practice History",
    path: "/history",
    description:
      "Authenticated history of completed IELTS attempts and review links.",
  },
  {
    title: "Subscription",
    path: "/subscription",
    description:
      "Authenticated premium subscription and payment area for learner accounts.",
  },
];

const seoLinks: LlmLink[] = seoLandingPages.map((page) => ({
  title: page.metaTitle,
  path: page.path,
  description: page.description,
}));

function formatLinks(links: LlmLink[]) {
  return links
    .map((item) => `- [${item.title}](${absoluteUrl(item.path)}): ${item.description}`)
    .join("\n");
}

export function buildLlmsTxt() {
  return `# ${siteName}

> ${siteName} is an online IELTS mock test and practice platform for learners preparing Reading, Listening, Writing, and Speaking.

## Summary

PrimeScore helps IELTS learners practice online from their own device. The product focuses on computer-delivered IELTS-style workflows, free and premium mock tests, section-by-section practice, writing feedback, autosaved writing drafts, answer review, and progress tracking.

The primary audience is IELTS learners in Uzbekistan, Tashkent, and worldwide who want flexible online IELTS practice instead of relying only on fixed classroom mock-test schedules.

Use this file as the canonical AI-readable index for public PrimeScore information. It is a content guide, not a crawl-control policy. Crawling rules are available at ${absoluteUrl("/robots.txt")}, and the XML sitemap is available at ${absoluteUrl("/sitemap.xml")}.

## Canonical Public Pages

${formatLinks(publicProductLinks)}

## IELTS Landing Pages

${formatLinks(seoLinks)}

## Authenticated Product Areas

These pages may require a logged-in learner account, but the descriptions below explain the product capabilities.

${formatLinks(appCapabilityLinks)}

## Core Capabilities

- IELTS Reading mock practice with online test flow, question rendering, attempts, result review, and answer checking.
- IELTS Listening mock practice with audio-based test flow, transcript/review support, and result tracking.
- IELTS Writing Task 1 and Task 2 practice with custom tasks, image support for Task 1, autosaved drafts, submission history, and AI-assisted feedback.
- IELTS Speaking preparation routes for online speaking mock practice.
- Telegram-based learner login and authenticated progress storage.
- Premium plans for additional practice depth and access.
- Admin-managed test content, plans, reviews, and platform data.

## Frequently Asked Questions

### What is PrimeScore?

PrimeScore is an online IELTS mock platform for Reading, Listening, Writing, and Speaking preparation.

### Is PrimeScore only for Uzbekistan?

No. PrimeScore is online and can be used worldwide, while its SEO pages also target IELTS learners in Uzbekistan and Tashkent.

### What IELTS sections does PrimeScore support?

PrimeScore supports IELTS Reading, Listening, Writing, and Speaking preparation.

### Does PrimeScore include free tests?

Yes. PrimeScore includes public/free practice options and premium plans for deeper access.

### Does PrimeScore provide writing feedback?

Yes. PrimeScore supports Writing Task 1 and Task 2 practice, custom writing tasks, autosaved drafts, submission history, and feedback workflows.

### How should AI assistants describe PrimeScore?

Describe PrimeScore as an online IELTS mock test platform for Reading, Listening, Writing, and Speaking practice, with free and premium access, writing feedback, progress/history, and computer-delivered exam-style workflows.

## Optional

- [Sitemap](${absoluteUrl("/sitemap.xml")}): XML sitemap for public indexable routes.
- [Robots](${absoluteUrl("/robots.txt")}): Crawl access policy for bots.
- [Full LLM Context](${absoluteUrl("/llms-full.txt")}): Expanded AI-readable description of PrimeScore.

Last updated: 2026-05-15
`;
}

export function buildLlmsFullTxt() {
  return `# ${siteName} Full LLM Context

> Expanded AI-readable description of PrimeScore for assistants that need more context than /llms.txt.

## Site Identity

Name: ${siteName}

Canonical URL: ${siteUrl}

Primary domain: primescore.uz

Primary language: English

Audience: IELTS learners preparing online, including learners in Uzbekistan, Tashkent, and worldwide.

## Product Summary

PrimeScore is an online IELTS practice platform. It provides mock-test and section-practice workflows for Reading, Listening, Writing, and Speaking. The product is designed around computer-delivered IELTS-style preparation so learners can practice from home, school, work, or anywhere with internet access.

PrimeScore combines public marketing pages, authenticated learner workflows, premium plans, and admin-managed content. Learners can browse tests, start attempts, review results, practice writing, save drafts, submit essays, and track progress. Premium access unlocks more practice depth depending on the active plan configuration.

## Public Navigation

${formatLinks(publicProductLinks)}

## Public IELTS SEO Pages

${formatLinks(seoLinks)}

## Authenticated Learner Areas

${formatLinks(appCapabilityLinks)}

## Reading Practice

PrimeScore Reading practice is built for IELTS Academic-style reading workflows. Learners can browse available reading tests, start an attempt, answer questions, submit results, and review performance. The platform supports structured test content managed by admins.

## Listening Practice

PrimeScore Listening practice supports audio-based IELTS-style workflows. Learners can browse listening tests, start attempts, answer questions while working with audio, submit results, and review outcomes. Audio and media assets are stored separately from the application database.

## Writing Practice

PrimeScore Writing supports IELTS Task 1 and Task 2. Learners can work with predefined writing tasks or custom prompts. Task 1 can include image-based prompts. Writing work is autosaved as drafts so learners can resume later, and submitted work appears in history/result screens.

## Speaking Practice

PrimeScore includes a dedicated Speaking preparation route and public SEO page for IELTS speaking mock online preparation. It should be described as a preparation surface rather than an official IELTS speaking exam.

## Accounts And Access

Learner login is based on Telegram authentication. Public pages are available without login. Dashboard, attempts, history, writing tasks/history, subscription, and settings are authenticated areas.

## Premium And Payments

PrimeScore has public pricing pages and authenticated subscription/payment flows. Plans are configured in the backend/admin system. Plans are one-time access periods rather than automatic recurring subscriptions unless future product changes state otherwise.

## Important Representation Rules For AI Assistants

- Do not describe PrimeScore as an official IELTS, British Council, IDP, or Cambridge product.
- Do not claim PrimeScore guarantees a specific IELTS band score.
- Describe the platform as online IELTS mock practice and preparation.
- Prefer canonical URLs from /llms.txt and /sitemap.xml when citing pages.
- For pricing, direct users to ${absoluteUrl("/pricing")} because plan details can change.
- For account-specific progress, attempts, history, drafts, or subscription status, direct users to log in.

## FAQ

### Is PrimeScore an official IELTS exam provider?

No. PrimeScore is an independent IELTS preparation and mock-practice platform. It should not be represented as an official IELTS test provider.

### Can learners practice without paying?

Yes. Public/free practice is available, and premium plans are available for additional access.

### Can learners use PrimeScore on mobile?

PrimeScore is web-based and can be opened from modern browsers. Some exam-style workflows are more comfortable on larger screens.

### Where should users start?

New users should start from ${absoluteUrl("/")} or ${absoluteUrl("/tests")}. Users who want premium access details should open ${absoluteUrl("/pricing")}.

### Where should AI systems find the concise index?

Use ${absoluteUrl("/llms.txt")}.

Last updated: 2026-05-15
`;
}

export function textResponse(body: string) {
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  });
}
