import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  Headphones,
  Mic,
  PenLine,
  Plus,
  ShieldCheck,
} from "lucide-react";
import type { LandingFeaturedTest } from "./landing-types";
import type { MarketingPlan } from "@/lib/server-plans";
import { landingFaqs } from "@/lib/seo";
import { LandingSample } from "./landing-sample";
import { LandingPricingPlanAction } from "./landing-pricing-auth";
import { LandingFooter } from "./landing-footer";
import styles from "./landing.module.css";
import { landingFont } from "./landing-font";
import { LandingMotionController } from "./landing-motion-controller";

const skills = [
  {
    name: "Reading",
    no: "01",
    description: "Find the evidence. Understand the answer.",
    href: "/tests?type=reading",
    Icon: BookOpen,
    tone: "orange",
  },
  {
    name: "Listening",
    no: "02",
    description: "Train your ear. Catch the details.",
    href: "/tests?type=listening",
    Icon: Headphones,
    tone: "green",
  },
  {
    name: "Writing",
    no: "03",
    description: "Build your argument. Refine your writing.",
    href: "/writing",
    Icon: PenLine,
    tone: "blue",
  },
  {
    name: "Speaking",
    no: "04",
    description: "Find your words. Practise speaking aloud.",
    Icon: Mic,
    tone: "gold",
    soon: true,
  },
];

export function LandingPage({
  plans,
  tests,
  publishedCount,
}: {
  plans: MarketingPlan[];
  tests: LandingFeaturedTest[];
  publishedCount: number;
}) {
  const firstFreeTest = tests.find((test) => !test.isPremiumLocked);
  const startHref = firstFreeTest
    ? `/tests/${firstFreeTest.slug}`
    : "#practice";
  return (
    <div id="landing" className={`${styles.landing} ${landingFont.className}`}>
      <LandingMotionController />
      <main id="main-content">
        <section
          className={styles.hero}
          aria-labelledby="hero-title"
          data-landing-section="home"
        >
          <div className={`${styles.container} ${styles.heroGrid}`}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>
                <span className={styles.smallLine} /> YOUR SPACE TO GET BETTER
              </p>
              <h1 id="hero-title">
                Your next
                <br />
                IELTS band
                <br />
                <em className={styles.heroAccent}>
                  starts here.
                  <svg
                    className={styles.inkUnderline}
                    viewBox="0 0 360 18"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M4 10C73 2 239 1 353 7M35 16C120 8 245 7 321 12"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                    />
                  </svg>
                </em>
              </h1>
              <p className={styles.heroDescription}>
                Real practice. Clear explanations. A little more confidence,
                every time you show up.
              </p>
              <nav className={styles.heroMockLinks} aria-label="Choose your mock">
                <Link href="/mock?mode=online" prefetch={false}>
                  <BookOpen size={19} aria-hidden="true" />
                  <span><strong>Online</strong><small>Practice at your pace</small></span>
                  <ArrowUpRight size={17} aria-hidden="true" />
                </Link>
                <Link href="/mock?mode=offline" prefetch={false}>
                  <CalendarDays size={19} aria-hidden="true" />
                  <span><strong>Offline</strong><small>Book an in-person mock</small></span>
                  <ArrowUpRight size={17} aria-hidden="true" />
                </Link>
              </nav>
              <div className={styles.heroActions}>
                <Link
                  href={startHref}
                  prefetch={false}
                  className={styles.primaryButton}
                >
                  {firstFreeTest ? "Try a free test" : "Explore practice tests"}{" "}
                  <ArrowUpRight size={19} aria-hidden="true" />
                </Link>
                <a href="#sample" className={styles.textLink}>
                  Try a question <ArrowRight size={16} aria-hidden="true" />
                </a>
              </div>
              <p className={styles.heroNote}>
                <CheckCircle2 size={15} aria-hidden="true" /> Free to explore{" "}
                <span /> Sign in to save your progress
              </p>
            </div>
            <div className={styles.heroVisual}>
              <div className={styles.sampleCaption}>
                <span>A small start is still a start.</span>
                <svg
                  className={styles.captionArrow}
                  width="35"
                  height="30"
                  viewBox="0 0 35 30"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M5 3C22 0 29 10 21 26M15 19L21 27L29 21"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <LandingSample />
            </div>
          </div>
          <div className={`${styles.container} ${styles.heroFootnote}`}>
            <span>LESS GUESSWORK. MORE PRACTICE.</span>
            <span>
              {publishedCount > 0 ? (
                <>
                  <strong>{publishedCount}</strong> published practice tests{" "}
                  <span className={styles.footnoteDot} />
                </>
              ) : null}
              Reading, Listening, Writing &amp; Speaking
            </span>
          </div>
        </section>

        <section
          className={`${styles.section} ${styles.container}`}
          id="practice"
          data-landing-section="practice"
          aria-labelledby="practice-title"
        >
          <div className={styles.sectionHeading} data-landing-reveal>
            <div>
              <p className={styles.eyebrow}>01 / FIND YOUR FOCUS</p>
              <h2 id="practice-title">What will you work on today?</h2>
            </div>
            <p>
              One skill. One session.
              <br />
              One step closer.
            </p>
          </div>
          <div className={styles.skillGrid}>
            {skills.map(({ name, no, description, href, Icon, tone, soon }) => {
              const content = (
                <>
                  <div className={styles.skillTop}>
                    <span className={styles.skillIcon} data-tone={tone}>
                      <Icon size={23} strokeWidth={1.6} aria-hidden="true" />
                    </span>
                    <span className={soon ? styles.soonBadge : undefined}>{soon ? "Soon" : no}</span>
                  </div>
                  <h3>
                    {name}
                    {soon ? null : <ArrowUpRight size={21} aria-hidden="true" />}
                  </h3>
                  <p>{description}</p>
                </>
              );

              return soon ? (
                <div
                  className={`${styles.skillLink} ${styles.skillLinkSoon}`}
                  key={name}
                  data-landing-reveal
                  data-skill={tone}
                  aria-disabled="true"
                >
                  {content}
                </div>
              ) : (
                <Link
                  href={href!}
                  prefetch={false}
                  className={styles.skillLink}
                  key={name}
                  data-landing-reveal
                  data-skill={tone}
                >
                  {content}
                </Link>
              );
            })}
          </div>
          <div className={styles.catalogHeading} id="featured-tests">
            <h3>A good place to begin</h3>
            <Link href="/tests" prefetch={false} className={styles.textLink}>
              All practice tests <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
          {tests.length ? (
            <div className={styles.testGrid}>
              {tests.map((test) => (
                <Link
                  href={`/tests/${test.slug}`}
                  key={test.id}
                  prefetch={false}
                  className={styles.testCard}
                  data-landing-reveal
                >
                  <div className={styles.testMeta}>
                    <span>
                      {test.type === "listening" ? (
                        <Headphones size={14} aria-hidden="true" />
                      ) : (
                        <BookOpen size={14} aria-hidden="true" />
                      )}
                      {test.type}
                    </span>
                    <span className={styles.accessLabel}>
                      {test.isPremiumLocked ? "Premium" : "Free practice"}
                    </span>
                  </div>
                  <h4>{test.title}</h4>
                  <div className={styles.testBottom}>
                    <span>
                      <Clock3 size={13} aria-hidden="true" />
                      {test.estimatedMinutes} min{" "}
                      <span aria-hidden="true">/</span> {test.questionCount}{" "}
                      questions
                    </span>
                    <ArrowUpRight size={20} aria-hidden="true" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className={styles.emptyCatalog}>
              <BookOpen size={28} aria-hidden="true" />
              <h4>The practice library is taking a short break.</h4>
              <p>
                We could not load the tests just now. You can still try the
                sample question above.
              </p>
              <Link href="/tests" prefetch={false} className={styles.textLink}>
                Open the practice library{" "}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          )}
        </section>


        <section
          className={styles.processSection}
          id="how-it-works"
          data-landing-section="how-it-works"
          aria-labelledby="process-title"
        >
          <div className={`${styles.container} ${styles.processGrid}`}>
            <div data-landing-reveal>
              <p className={styles.eyebrow}>03 / MAKE PRACTICE COUNT</p>
              <h2 id="process-title">
                Not just a score.
                <br />
                <em>A way forward.</em>
              </h2>
              <p className={styles.processIntro}>
                The useful part comes after the answer. Find what you missed,
                understand why, and bring that knowledge to your next test.
              </p>
              <a href="#sample" className={styles.textLink}>
                See an explanation in action{" "}
                <ArrowUpRight size={17} aria-hidden="true" />
              </a>
            </div>
            <ol className={styles.steps}>
              <li data-landing-reveal>
                <span>01</span>
                <div>
                  <h3>Practise on your terms</h3>
                  <p>
                    Choose a skill and a test. Get familiar with the
                    computer-based format at your own pace.
                  </p>
                </div>
              </li>
              <li data-landing-reveal>
                <span>02</span>
                <div>
                  <h3>Understand the mistake</h3>
                  <p>
                    Review your answers and available explanations. Use AI
                    feedback to reflect on your writing.
                  </p>
                </div>
              </li>
              <li data-landing-reveal>
                <span>03</span>
                <div>
                  <h3>Come back a little stronger</h3>
                  <p>
                    Keep your attempts in one place. Turn what you learnt into
                    your next focused practice session.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        <section
          className={`${styles.section} ${styles.container}`}
          id="pricing"
          data-landing-section="pricing"
          aria-labelledby="pricing-title"
        >
          <div className={styles.sectionHeading} data-landing-reveal>
            <div>
              <p className={styles.eyebrow}>04 / ROOM TO GO FURTHER</p>
              <h2 id="pricing-title">Start free. Stay for the progress.</h2>
            </div>
            <p>
              More practice, when you need it.
              <br />
              Choose the time that works for you.
            </p>
          </div>
          <div className={styles.pricingGrid}>
            {plans.map((plan) => (
              <article
                className={styles.planCard}
                key={plan.id}
                data-featured={plan.isFeatured}
                data-landing-reveal
              >
                <div className={styles.planTop}>
                  <h3>{plan.title}</h3>
                  {plan.isFeatured ? (
                    <span>Recommended</span>
                  ) : (
                    <span>{plan.durationDays} days</span>
                  )}
                </div>
                <p className={styles.planPrice}>{plan.priceLabel}</p>
                <p className={styles.planPeriod}>
                  {plan.monthlyLabel || `${plan.durationDays} days of access`}
                </p>
                <div className={styles.planAction}>
                  <LandingPricingPlanAction
                    planId={plan.id}
                    planName={plan.title}
                    durationDays={plan.durationDays}
                    numericPrice={plan.numericPrice}
                    currency={plan.currency}
                    label={`Choose ${plan.title}`}
                    buttonClassName={
                      plan.isFeatured
                        ? styles.primaryButton
                        : styles.outlineButton
                    }
                  />
                </div>
                <ul className={styles.planPerks}>
                  {plan.perks.map((perk) => (
                    <li key={perk}>
                      <Check size={16} aria-hidden="true" />
                      {perk}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          {plans.length === 0 ? (
            <p className={styles.pricingNote}>
              Plans are temporarily unavailable. Free practice is still a good
              place to start.
            </p>
          ) : null}
          <p className={styles.pricingNote}>
            <ShieldCheck size={16} aria-hidden="true" /> One-time payment. No
            automatic renewal.{" "}
            <a
              href="https://t.me/TheBugCreator"
              target="_blank"
              rel="noopener noreferrer"
            >
              Questions? Talk to us{" "}
              <ArrowUpRight size={13} aria-hidden="true" />
            </a>
          </p>
        </section>

        <section
          className={styles.faqSection}
          id="faq"
          data-landing-section="faq"
          aria-labelledby="faq-title"
        >
          <div className={`${styles.container} ${styles.faqGrid}`}>
            <div data-landing-reveal>
              <p className={styles.eyebrow}>05 / BEFORE YOU BEGIN</p>
              <h2 id="faq-title">
                A few good
                <br />
                <em>questions.</em>
              </h2>
              <p>Something else on your mind?</p>
              <a
                href="https://t.me/TheBugCreator"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.textLink}
              >
                Ask us on Telegram <ArrowUpRight size={16} aria-hidden="true" />
              </a>
            </div>
            <div className={styles.faqList}>
              {landingFaqs.map((faq) => (
                <details key={faq.question} data-landing-reveal>
                  <summary>
                    {faq.question}
                    <Plus size={19} aria-hidden="true" />
                  </summary>
                  <p>{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
        <section className={styles.finalSection} aria-labelledby="final-title">
          <div
            className={`${styles.container} ${styles.finalInner}`}
            data-landing-reveal
          >
            <div>
              <p className={styles.eyebrow}>
                A LITTLE PRACTICE GOES A LONG WAY
              </p>
              <h2 id="final-title">
                Make today a <em>practice day.</em>
              </h2>
            </div>
            <Link
              href={startHref}
              prefetch={false}
              className={styles.primaryButton}
            >
              Find your first test <ArrowUpRight size={20} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
