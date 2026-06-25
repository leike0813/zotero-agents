import { useEffect, useRef } from "react";
import useBaseUrl from "@docusaurus/useBaseUrl";
import styles from "./styles.module.css";

type SlideImage = {
  src: string;
  alt: string;
};

type Slide = {
  title: string;
  description: string;
  badge: string;
  images: SlideImage[];
};

type HomeScreenshotSliderProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  previousLabel: string;
  nextLabel: string;
  slides: Slide[];
};

function SlideMedia({ images }: { images: SlideImage[] }) {
  const baseUrl = useBaseUrl("/");
  const resolvedImages = images.map((image) => ({
    ...image,
    src: `${baseUrl.replace(/\/$/, "")}${image.src}`,
  }));

  if (resolvedImages.length === 1) {
    const image = resolvedImages[0];
    return (
      <div className={styles.imageFrame}>
        <img className={styles.image} src={image.src} alt={image.alt} loading="lazy" />
      </div>
    );
  }

  return (
    <div className={styles.imageFrame}>
      <div className={styles.imageTriptych}>
        {resolvedImages.map((image) => (
          <img key={image.src} src={image.src} alt={image.alt} loading="lazy" />
        ))}
      </div>
    </div>
  );
}

export default function HomeScreenshotSlider({
  eyebrow,
  title,
  subtitle,
  previousLabel,
  nextLabel,
  slides,
}: HomeScreenshotSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  function getScrollDistance(track: HTMLDivElement) {
    return Math.min(track.clientWidth * 0.9, 920);
  }

  function scroll(direction: "prev" | "next", behavior: ScrollBehavior = "smooth") {
    const track = trackRef.current;
    if (!track) return;

    const distance = getScrollDistance(track);
    track.scrollBy({
      left: direction === "next" ? distance : -distance,
      behavior,
    });
  }

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return undefined;

    const timer = window.setInterval(() => {
      const nearEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 24;
      track.scrollTo({
        left: nearEnd ? 0 : track.scrollLeft + getScrollDistance(track),
        behavior: "smooth",
      });
    }, 5200);

    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className={styles.section} aria-labelledby="showcase-title">
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h2 id="showcase-title" className={styles.title}>
            {title}
          </h2>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>
      </div>

      <div className={styles.sliderShell}>
        <button
          type="button"
          className={`${styles.navButton} ${styles.navButtonPrev}`}
          onClick={() => scroll("prev")}
          aria-label={previousLabel}
        >
          ‹
        </button>
        <div className={styles.track} ref={trackRef}>
          {slides.map((slide) => (
            <article className={styles.card} key={slide.title}>
              <SlideMedia images={slide.images} />
              <div className={styles.caption}>
                <span className={styles.badge}>{slide.badge}</span>
                <h3>{slide.title}</h3>
                <p>{slide.description}</p>
              </div>
            </article>
          ))}
        </div>
        <button
          type="button"
          className={`${styles.navButton} ${styles.navButtonNext}`}
          onClick={() => scroll("next")}
          aria-label={nextLabel}
        >
          ›
        </button>
      </div>
    </section>
  );
}
