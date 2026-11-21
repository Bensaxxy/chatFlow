"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface LandingScrollEffectsProps {
  children: ReactNode;
}

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(Math.max(value, minimum), maximum);

const easeOutCubic = (value: number): number => 1 - (1 - value) ** 3;

export default function LandingScrollEffects({
  children,
}: LandingScrollEffectsProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const motionPreference = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    let frameId: number | null = null;

    const targets = (): NodeListOf<HTMLElement> =>
      container.querySelectorAll<HTMLElement>(
        "[data-landing-hero], [data-landing-reveal]",
      );

    const resetEffects = (): void => {
      targets().forEach((target) => {
        target.style.removeProperty("transform");
        target.style.removeProperty("opacity");
      });
    };

    const updateEffects = (): void => {
      frameId = null;

      if (motionPreference.matches) {
        resetEffects();
        return;
      }

      const viewportHeight = Math.max(window.innerHeight, 1);
      const hero = container.querySelector<HTMLElement>("[data-landing-hero]");

      if (hero) {
        const progress = clamp(window.scrollY / (viewportHeight * 0.9), 0, 1);
        hero.style.transform = `translate3d(0, ${-progress * 58}px, 0) rotateX(${progress * 9}deg) rotateY(${-progress * 7}deg) scale(${1 - progress * 0.055})`;
        hero.style.opacity = `${1 - progress * 0.16}`;
      }

      container
        .querySelectorAll<HTMLElement>("[data-landing-reveal]")
        .forEach((target, index) => {
          const bounds = target.getBoundingClientRect();
          const rawProgress = clamp(
            (viewportHeight * 0.92 - bounds.top) / (viewportHeight * 0.72),
            0,
            1,
          );
          const progress = easeOutCubic(rawProgress);
          const direction = Number(
            target.dataset.landingDirection ?? (index % 2 ? -1 : 1),
          );
          const remaining = 1 - progress;

          target.style.transform = `perspective(1100px) translate3d(0, ${remaining * 46}px, 0) rotateX(${remaining * 8}deg) rotateY(${remaining * direction * 4}deg)`;
          target.style.opacity = `${0.42 + progress * 0.58}`;
        });
    };

    const requestUpdate = (): void => {
      if (frameId === null) {
        frameId = window.requestAnimationFrame(updateEffects);
      }
    };

    const handleMotionPreferenceChange = (): void => {
      resetEffects();
      requestUpdate();
    };

    requestUpdate();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    motionPreference.addEventListener("change", handleMotionPreferenceChange);

    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      motionPreference.removeEventListener("change", handleMotionPreferenceChange);

      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }

      resetEffects();
    };
  }, []);

  return <div ref={containerRef}>{children}</div>;
}
