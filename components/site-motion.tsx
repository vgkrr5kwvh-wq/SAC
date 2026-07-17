"use client";

import { useEffect } from "react";

export default function SiteMotion() {
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = document.documentElement;
    const header = document.querySelector<HTMLElement>(".site-header");
    const hero = document.querySelector<HTMLElement>(".hero");
    const targets = document.querySelectorAll<HTMLElement>(
      [
        ".hero-copy > *",
        ".hero-media",
        ".section-heading > *",
        ".split-grid > *",
        ".contact-grid > *",
        ".location-heading > *",
        ".inner-hero-grid > *",
        ".blog-toolbar > *",
        ".partner-form-grid > *",
        ".faq-grid > *",
        ".service-card",
        ".journey-grid article",
        ".destination-grid article",
        ".story-grid blockquote",
        ".page-content-card",
        ".blog-card",
        ".contact-details > *",
        ".page-card-media",
        ".roadmap-photo",
      ].join(",")
    );

    targets.forEach((target, index) => {
      target.classList.add("reveal-item");
      target.style.setProperty("--reveal-delay", `${Math.min(index % 5, 4) * 70}ms`);
    });

    if (reduceMotion) {
      targets.forEach((target) => target.classList.add("is-revealed"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -35px" }
    );

    targets.forEach((target) => observer.observe(target));

    let frame = 0;
    const updateScrollEffects = () => {
      frame = 0;
      const scrollTop = window.scrollY;
      const scrollRange = document.documentElement.scrollHeight - window.innerHeight;
      root.style.setProperty("--scroll-progress", `${scrollRange > 0 ? scrollTop / scrollRange : 0}`);
      root.style.setProperty("--hero-shift", `${Math.min(scrollTop * 0.075, 48)}px`);
      header?.classList.toggle("is-condensed", scrollTop > 70);
      hero?.classList.toggle("is-scrolled", scrollTop > 24);
    };
    const handleScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(updateScrollEffects);
    };
    updateScrollEffects();
    window.addEventListener("scroll", handleScroll, { passive: true });

    const spotlightCards = document.querySelectorAll<HTMLElement>(
      ".service-card, .page-content-card, .blog-card, .story-grid blockquote, .contact-form"
    );
    const spotlightCleanups = [...spotlightCards].map((card) => {
      const moveSpotlight = (event: PointerEvent) => {
        const bounds = card.getBoundingClientRect();
        card.style.setProperty("--spot-x", `${event.clientX - bounds.left}px`);
        card.style.setProperty("--spot-y", `${event.clientY - bounds.top}px`);
      };
      card.addEventListener("pointermove", moveSpotlight);
      return () => card.removeEventListener("pointermove", moveSpotlight);
    });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
      if (frame) window.cancelAnimationFrame(frame);
      spotlightCleanups.forEach((cleanup) => cleanup());
    };
  }, []);

  return <div className="scroll-progress" aria-hidden="true" />;
}
