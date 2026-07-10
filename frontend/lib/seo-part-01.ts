export const siteName = "PrimeScore";

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://primescore.uz").replace(/\/$/, "");

export const defaultOgImage = "/logo.jpg";

export const defaultSiteIcon = "/logo-light.svg";

export const brandAliases = [
  "Prime Score",
  "PrimeScore.uz",
  "Prime Score UZ",
  "PrimeScore Uzbekistan",
];

export const landingKeywords = [
  "IELTS mock test",
  "IELTS mock test online",
  "IELTS mock online",
  "IELTS mock platform",
  "IELTS mock test Uzbekistan",
  "IELTS mock test Tashkent online",
  "Tashkent IELTS mock online",
  "IELTS practice test free",
  "IELTS reading practice",
  "IELTS reading practice test",
  "IELTS reading mock online",
  "IELTS reading mock platform",
  "IELTS academic reading practice",
  "IELTS listening practice",
  "IELTS listening practice test",
  "IELTS listening mock online",
  "IELTS listening mock platform",
  "IELTS academic listening practice",
  "IELTS writing mock online",
  "IELTS writing checker online",
  "IELTS writing Task 1 feedback",
  "IELTS writing Task 2 feedback",
  "IELTS speaking mock online",
  "speaking mock online IELTS",
  "computer-delivered IELTS practice",
  "IELTS vocabulary practice",
  "English learning for IELTS",
  "English listening practice",
  "IELTS band score practice",
  "IELTS preparation online",
  "PrimeScore",
  "PrimeScore.uz",
  "Prime Score",
  "IELTS Uzbekistan",
  "IELTS Tashkent online",
  "ielts tayyorlov",
  "ielts mock online uzbekistan",
  "ielts mock tashkent",
  "ielts speaking mock online",
  "ielts writing checker",
  "ielts reading mashqlari",
  "ielts listening mashqlari",
  "ingliz tili ielts",
];

export const pricingKeywords = [
  ...landingKeywords,
  "IELTS pricing",
  "IELTS subscription",
  "IELTS premium plans",
  "IELTS course price",
  "IELTS preparation pricing",
  "IELTS mock test subscription",
  "PrimeScore pricing",
  "Prime Score pricing",
  "PrimeScore premium",
  "ielts narx",
  "ielts premium narx",
  "ingliz tili ielts narx",
];

export const landingFaqs = [
  {
    question: "What can I practice on PrimeScore?",
    answer:
      "PrimeScore is an online IELTS mock platform for Reading, Listening, Writing, and Speaking preparation, with exam-style practice, writing feedback, review tools, and band-score focused study.",
  },
  {
    question: "Is PrimeScore useful for computer-delivered IELTS preparation?",
    answer:
      "Yes. PrimeScore is designed around a computer-delivered IELTS workflow so learners can practice Reading, Listening, Writing, and Speaking preparation online.",
  },
  {
    question: "Does PrimeScore help with IELTS Writing and Speaking mock preparation?",
    answer:
      "Yes. PrimeScore includes Writing practice with custom topics and feedback, and provides a dedicated route for Speaking mock online preparation inside the IELTS platform.",
  },
  {
    question: "Can students in Uzbekistan or Tashkent use PrimeScore for IELTS mock online?",
    answer:
      "Yes. PrimeScore is fully online for IELTS learners in Uzbekistan, Tashkent, and beyond who want structured IELTS mock practice without relying on a physical mock center schedule.",
  },
  {
    question: "Are there free IELTS practice tests on PrimeScore?",
    answer:
      "Yes. PrimeScore includes free access content and premium practice options so learners can start IELTS mock preparation online and upgrade when they need deeper review.",
  },
];

export const pricingFaqs = [
  {
    question: "What is included in PrimeScore Premium?",
    answer:
      "PrimeScore Premium unlocks premium IELTS mock practice depth, including Reading and Listening tests, detailed answer explanations, and a longer-term study path for consistent online preparation.",
  },
  {
    question: "Can I use PrimeScore for free before upgrading?",
    answer:
      "Yes. PrimeScore keeps public IELTS mock practice available so learners can start free before choosing a premium plan.",
  },
  {
    question: "Do PrimeScore plans renew automatically?",
    answer:
      "No. PrimeScore uses one-time plans. If you want to continue after your plan ends, you choose and purchase another plan manually.",
  },
  {
    question: "Is PrimeScore suitable for IELTS students in Uzbekistan?",
    answer:
      "Yes. PrimeScore is designed for IELTS learners in Uzbekistan and other markets who want structured IELTS mock online preparation.",
  },
];

export function absoluteUrl(path = "/"): string {
  return new URL(path, `${siteUrl}/`).toString();
}
