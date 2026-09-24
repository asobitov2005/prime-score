"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  BookOpen,
  ChevronDown,
  Headphones,
  Menu,
  Mic,
  Moon,
  PenSquare,
  Sun,
  X,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import styles from "./landing.module.css";
import { landingFont } from "./landing-font";

export function LandingHeader() {
  const [open, setOpen] = useState(false);
  const [practiceOpen, setPracticeOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const practiceButton = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);
  const authenticated = useAuthStore(
    (state) => state.hasHydrated && state.isAuthenticated,
  );
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);
  useEffect(() => {
    if (!open && !practiceOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setPracticeOpen(false);
        if (open) menuButton.current?.focus();
        else practiceButton.current?.focus();
      }
    };
    const closeOutside = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) {
        setOpen(false);
        setPracticeOpen(false);
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOutside);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOutside);
    };
  }, [open, practiceOpen]);
  function toggleTheme() {
    const nextDark = !dark;
    setDark(nextDark);
    document.documentElement.classList.toggle("dark", nextDark);
    document.documentElement.classList.toggle("light", !nextDark);
    try {
      localStorage.setItem("prime-theme", nextDark ? "dark" : "light");
    } catch {
      /* Theme still works without storage. */
    }
  }
  return (
    <header
      className={`${styles.header} ${landingFont.className}`}
      ref={header}
    >
      <a className={styles.skipLink} href="#main-content">
        Skip to content
      </a>
      <div className={styles.headerInner}>
        <Link href="/" className={styles.brand} aria-label="PrimeScore home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={dark ? "/logo.svg" : "/logo-light.svg"}
            width={36}
            height={36}
            alt=""
          />
          <span>
            Prime<span>Score</span>
            <span className={styles.brandPeriod}>.</span>
          </span>
        </Link>
        <nav className={styles.desktopNav} aria-label="Main navigation">
          <div
            className={styles.practiceMenu}
            data-open={practiceOpen}
            onMouseEnter={() => setPracticeOpen(true)}
            onMouseLeave={() => setPracticeOpen(false)}
            onFocus={() => setPracticeOpen(true)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setPracticeOpen(false);
              }
            }}
          >
            <button
              ref={practiceButton}
              type="button"
              className={styles.practiceTrigger}
              aria-expanded={practiceOpen}
              aria-controls="landing-practice-menu"
              onClick={() => setPracticeOpen(true)}
            >
              Practice <ChevronDown size={14} aria-hidden="true" />
            </button>
            <div id="landing-practice-menu" className={styles.practiceDropdown}>
              <PracticeMenuLink
                href="/tests?type=reading"
                title="Reading"
                description="Academic IELTS practice"
                icon={<BookOpen size={18} aria-hidden="true" />}
              />
              <PracticeMenuLink
                href="/tests?type=listening"
                title="Listening"
                description="Listen closely. Find the answer."
                icon={<Headphones size={18} aria-hidden="true" />}
              />
              <PracticeMenuLink
                href="/writing"
                title="Writing"
                description="Task 1 and Task 2"
                icon={<PenSquare size={18} aria-hidden="true" />}
              />
              <div className={styles.practiceItemSoon} aria-label="Speaking, coming soon">
                <span className={styles.practiceIcon}><Mic size={18} aria-hidden="true" /></span>
                <span className={styles.practiceItemCopy}>
                  <strong>Speaking</strong>
                  <small>Speaking practice is in the works</small>
                </span>
                <span className={styles.practiceSoon}>Soon</span>
              </div>
            </div>
          </div>
          <Link href="/mock" prefetch={false}>
            Mock
          </Link>
          <a href="#how-it-works" data-landing-nav>
            How it works
          </a>
          <a href="#pricing" data-landing-nav>
            Pricing
          </a>
          <a href="#faq" data-landing-nav>
            FAQ
          </a>
        </nav>
        <div className={styles.headerActions}>
          <button
            type="button"
            onClick={toggleTheme}
            className={styles.themeButton}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Link
            href={authenticated ? "/dashboard" : "/login"}
            prefetch={false}
            className={styles.loginLink}
          >
            {authenticated ? "Dashboard" : "Log in"}
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
          <button
            ref={menuButton}
            type="button"
            className={styles.menuButton}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="landing-mobile-menu"
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>
      <nav
        id="landing-mobile-menu"
        className={styles.mobileNav}
        aria-label="Mobile navigation"
        hidden={!open}
      >
        <div className={styles.mobilePracticeGroup}>
          <p>Practice</p>
          <Link href="/tests?type=reading" onClick={() => setOpen(false)}>
            Reading <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
          <Link href="/tests?type=listening" onClick={() => setOpen(false)}>
            Listening <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
          <Link href="/writing" onClick={() => setOpen(false)}>
            Writing <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
          <span className={styles.mobilePracticeSoon} aria-disabled="true">
            Speaking <span>Soon</span>
          </span>
        </div>
        {[
          ["/mock", "Mock"],
          ["#how-it-works", "How it works"],
          ["#pricing", "Pricing"],
          ["#faq", "FAQ"],
        ].map(([href, label]) => (
          <a
            key={href}
            href={href}
            data-landing-nav
            onClick={() => setOpen(false)}
          >
            {label}
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        ))}
      </nav>
    </header>
  );
}

function PracticeMenuLink({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;
}) {
  return (
    <Link href={href} className={styles.practiceItem}>
      <span className={styles.practiceIcon}>{icon}</span>
      <span className={styles.practiceItemCopy}>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <ArrowUpRight className={styles.practiceItemArrow} size={14} aria-hidden="true" />
    </Link>
  );
}
