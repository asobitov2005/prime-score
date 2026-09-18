"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Menu, Moon, Sun, X } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import styles from "./landing.module.css";
import { landingFont } from "./landing-font";

export function LandingHeader() {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);
  const authenticated = useAuthStore(
    (state) => state.hasHydrated && state.isAuthenticated,
  );
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    const closeOutside = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOutside);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOutside);
    };
  }, [open]);
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
          <a href="#practice" data-landing-nav>
            Practice
          </a>
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
        {[
          ["#practice", "Practice"],
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
