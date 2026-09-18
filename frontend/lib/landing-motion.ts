/** Progressive enhancement: nothing is hidden while JS or motion is unavailable. */
export function setupLandingMotion(root: HTMLElement): () => void {
  const document = root.ownerDocument;
  const view = document.defaultView;
  if (!view || typeof IntersectionObserver === "undefined") return () => {};

  const preference = view.matchMedia("(prefers-reduced-motion: reduce)");
  const seen = new WeakSet<Element>();
  const running = new Set<Animation>();
  let reveals: IntersectionObserver | null = null;
  const links = Array.from(
    document.querySelectorAll<HTMLAnchorElement>("[data-landing-nav]"),
  );

  let navigation: IntersectionObserver | null = null;
  let navigationHeight = 0;
  function observeNavigation() {
    if (navigationHeight === view!.innerHeight) return;
    navigationHeight = view!.innerHeight;
    navigation?.disconnect();
    navigation = new IntersectionObserver(
      (entries) => {
        const section = entries.filter((entry) => entry.isIntersecting).pop()
          ?.target as HTMLElement | undefined;
        if (!section) return;
        for (const link of links) {
          if (link.hash === `#${section.dataset.landingSection}`)
            link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        }
      },
      {
        // A one-pixel reading line avoids selecting two adjacent sections at once.
        rootMargin: `-${Math.round(navigationHeight * 0.25)}px 0px -${navigationHeight - Math.round(navigationHeight * 0.25) - 1}px 0px`,
        threshold: 0,
      },
    );
    root
      .querySelectorAll("[data-landing-section]")
      .forEach((section) => navigation?.observe(section));
  }
  observeNavigation();

  function settle() {
    running.forEach((animation) => animation.cancel());
    running.clear();
  }

  function observeReveals() {
    reveals?.disconnect();
    settle();
    if (preference.matches || typeof root.animate !== "function") return;

    const compact = view!.innerWidth <= 640;
    reveals = new IntersectionObserver(
      (entries, observer) => {
        let order = 0;
        for (const entry of entries) {
          if (
            !entry.isIntersecting ||
            entry.intersectionRatio < 0.12 ||
            seen.has(entry.target)
          )
            continue;
          observer.unobserve(entry.target);
          seen.add(entry.target);
          if (document.visibilityState === "hidden" || !root.isConnected)
            continue;

          const target = entry.target as HTMLElement;
          target.dataset.motionSeen = "true";
          const animation = target.animate(
            [
              {
                transform: `translateY(${compact ? 12 : 18}px)`,
                opacity: 0.8,
              },
              { transform: "none", opacity: 1 },
            ],
            {
              duration: compact ? 380 : 480,
              delay: 120 + (order++ % 3) * (compact ? 45 : 60),
              easing: "cubic-bezier(0.22, 1, 0.36, 1)",
              fill: "backwards",
            },
          );
          running.add(animation);
          animation.onfinish = animation.oncancel = () =>
            running.delete(animation);
        }
      },
      // Start inside the viewport, not before the visitor can see the element.
      { rootMargin: "0px 0px -32px 0px", threshold: 0.12 },
    );

    // Read positions once, not on scroll. Already-visible content never flashes on hydration.
    const targets = Array.from(
      root.querySelectorAll<HTMLElement>("[data-landing-reveal]"),
    )
      .filter((target) => !seen.has(target))
      .map((target) => ({ target, top: target.getBoundingClientRect().top }));
    for (const { target, top } of targets) {
      if (top < view!.innerHeight) {
        seen.add(target);
        target.dataset.motionSeen = "true";
      } else reveals.observe(target);
    }
  }

  function handleVisibility() {
    if (document.visibilityState === "hidden") settle();
  }

  observeReveals();
  preference.addEventListener("change", observeReveals);
  document.addEventListener("visibilitychange", handleVisibility);
  view.addEventListener("resize", observeNavigation, { passive: true });
  return () => {
    navigation?.disconnect();
    reveals?.disconnect();
    settle();
    links.forEach((link) => link.removeAttribute("aria-current"));
    preference.removeEventListener("change", observeReveals);
    document.removeEventListener("visibilitychange", handleVisibility);
    view.removeEventListener("resize", observeNavigation);
  };
}
