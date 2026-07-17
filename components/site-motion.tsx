"use client";

import { animate, inView, stagger } from "motion";
import { useEffect } from "react";

export default function SiteMotion() {
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = document.documentElement;
    const header = document.querySelector<HTMLElement>(".site-header");
    const hero = document.querySelector<HTMLElement>(".hero");
    const cleanups: Array<() => void> = [];
    const controls: Array<{ stop: () => void }> = [];

    if (!reduceMotion) {
      const heroCopyItems = document.querySelectorAll<HTMLElement>(
        ".hero-copy > .eyebrow, .hero-copy > h1, .hero-copy > p, .hero-copy > .button-row, .hero-metrics"
      );

      if (heroCopyItems.length) {
        controls.push(
          animate(
            heroCopyItems,
            { opacity: [0, 1], y: [16, 0] },
            { duration: .62, delay: stagger(.07), ease: [.22, 1, .36, 1] }
          )
        );
      }

      const heroMedia = document.querySelector<HTMLElement>(".hero-media");
      if (heroMedia) {
        controls.push(
          animate(
            heroMedia,
            { opacity: [0, 1], x: [10, 0], scale: [.985, 1] },
            { duration: .72, delay: .12, ease: [.22, 1, .36, 1] }
          )
        );
      }

      const trustBadges = document.querySelectorAll<HTMLElement>(".trust-grid span");
      if (trustBadges.length) {
        controls.push(
          animate(
            trustBadges,
            { opacity: [.55, 1], y: [6, 0] },
            { duration: .42, delay: stagger(.045, { startDelay: .28 }), ease: "easeOut" }
          )
        );
      }

      document.querySelectorAll<HTMLElement>(".card-grid, .destination-grid, .story-grid").forEach((grid) => {
        Array.from(grid.children).forEach((card) => {
          (card as HTMLElement).style.opacity = "0";
        });
        const stop = inView(
          grid,
          () => {
            const cards = Array.from(grid.children) as HTMLElement[];
            controls.push(
              animate(
                cards,
                { opacity: [0, 1], y: [30, 0] },
                { duration: .68, delay: stagger(.1), ease: [.22, 1, .36, 1] }
              )
            );
          },
          { amount: .16, margin: "0px 0px -8%" }
        );
        cleanups.push(stop);
      });

      document.querySelectorAll<HTMLElement>(
        ".section-heading, .split-grid > div:last-child, .contact-grid > div:first-child, .location-heading"
      ).forEach((section) => {
        section.style.opacity = "0";
        const stop = inView(
          section,
          () => {
            controls.push(
              animate(
                section,
                { opacity: [0, 1], y: [22, 0] },
                { duration: .7, ease: [.22, 1, .36, 1] }
              )
            );
          },
          { amount: .2, margin: "0px 0px -10%" }
        );
        cleanups.push(stop);
      });

      const timeline = document.querySelector<HTMLElement>(".journey-grid");
      if (timeline) {
        Array.from(timeline.children).forEach((step) => {
          (step as HTMLElement).style.opacity = "0";
        });
        const stop = inView(
          timeline,
          () => {
            timeline.classList.add("timeline-is-visible");
            controls.push(
              animate(
                Array.from(timeline.children) as HTMLElement[],
                { opacity: [0, 1], x: [-18, 0] },
                { duration: .62, delay: stagger(.12), ease: [.22, 1, .36, 1] }
              )
            );
          },
          { amount: .22, margin: "0px 0px -8%" }
        );
        cleanups.push(stop);
      }

      document.querySelectorAll<HTMLElement>(".button, .nav-cta").forEach((button) => {
        const enter = () => {
          controls.push(animate(button, { y: -3, scale: 1.015 }, { duration: .22, ease: "easeOut" }));
        };
        const leave = () => {
          controls.push(animate(button, { y: 0, scale: 1 }, { duration: .28, ease: [.22, 1, .36, 1] }));
        };
        button.addEventListener("pointerenter", enter);
        button.addEventListener("pointerleave", leave);
        cleanups.push(() => {
          button.removeEventListener("pointerenter", enter);
          button.removeEventListener("pointerleave", leave);
        });
      });
    }

    let frame = 0;
    const updateScrollEffects = () => {
      frame = 0;
      const scrollTop = window.scrollY;
      const scrollRange = document.documentElement.scrollHeight - window.innerHeight;
      root.style.setProperty("--scroll-progress", `${scrollRange > 0 ? scrollTop / scrollRange : 0}`);
      root.style.setProperty("--hero-shift", reduceMotion ? "0px" : `${Math.min(scrollTop * .075, 48)}px`);
      header?.classList.toggle("is-condensed", scrollTop > 70);
      hero?.classList.toggle("is-scrolled", scrollTop > 24);
    };
    const handleScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(updateScrollEffects);
    };

    updateScrollEffects();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (frame) window.cancelAnimationFrame(frame);
      controls.forEach((control) => control.stop());
      cleanups.forEach((cleanup) => cleanup());
    };
  }, []);

  return <div className="scroll-progress" aria-hidden="true" />;
}
