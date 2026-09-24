import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import styles from "./landing.module.css";

export function LandingFooter() {
  return (
    <footer className={styles.footer} id="about">
      <div className={`${styles.container} ${styles.footerGrid}`}>
        <div>
          <Link href="/" className={styles.footerBrand}>
            Prime<span>Score.</span>
          </Link>
          <p>
            A space for focused IELTS practice.
            <br />
            Made for the progress you earn.
          </p>
          <p className={styles.disclaimer}>
            Independent practice platform. Not affiliated with IELTS, the
            British Council, IDP or Cambridge.
          </p>
        </div>
        <div>
          <h2>Find your focus</h2>
          <Link href="/tests?type=reading" prefetch={false}>
            Reading
          </Link>
          <Link href="/tests?type=listening" prefetch={false}>
            Listening
          </Link>
          <Link href="/writing" prefetch={false}>
            Writing
          </Link>
          <span className={styles.footerSoon} aria-disabled="true">
            Speaking <span>Soon</span>
          </span>
        </div>
        <div>
          <h2>The essentials</h2>
          <a href="#how-it-works">How it works</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">Questions &amp; answers</a>
          <Link href="/login" prefetch={false}>
            Your account
          </Link>
        </div>
        <div>
          <h2>Say hello</h2>
          <a
            href="https://t.me/PrimeScoreUz"
            target="_blank"
            rel="noopener noreferrer"
          >
            Telegram <ArrowUpRight size={13} aria-hidden="true" />
          </a>
          <a
            href="https://instagram.com/PrimeScoreUz"
            target="_blank"
            rel="noopener noreferrer"
          >
            Instagram <ArrowUpRight size={13} aria-hidden="true" />
          </a>
          <a
            href="https://t.me/TheBugCreator"
            target="_blank"
            rel="noopener noreferrer"
          >
            Get support <ArrowUpRight size={13} aria-hidden="true" />
          </a>
        </div>
      </div>
      <div className={`${styles.container} ${styles.footerBottom}`}>
        <span>&copy; {new Date().getFullYear()} PrimeScore</span>
        <span>Small steps. Real progress.</span>
      </div>
    </footer>
  );
}
