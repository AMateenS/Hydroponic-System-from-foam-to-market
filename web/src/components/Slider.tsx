"use client";
import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { EASE } from "./motion";

const IMAGES = [
  "/mnsau0.png",
  "/mnsau1.png",
  "/mnsau2.png",
  "/mnsau3.png",
  "/mnsau4.png",
  "/mnsau5.png",
  "/mnsau6.png",
  "/mnsau7.png",
];

const QUOTES = [
  "Smart Hydroponics. Fresh Harvests.",
  "Clean, Green, and Ready to Deliver.",
  "Direct from Hydroponic Farms.",
  "Future-Ready Agriculture Solutions.",
  "Less Water. More Growth.",
  "From Our Controlled Fields to Your Home.",
  "Real-Time Monitoring. Real Fresh Results.",
  "Smart Systems for Sustainable Farming.",
  "Precision Farming Made Simple.",
  "Engineering the Future of Farming.",
  "Farm-Fresh Products, One Click Away.",
  "Sustainable Farming Through Innovation.",
  "Clean Food Starts with Clean Farming.",
];

const SLIDE_MS = 4500;

const Slider = () => {
  const [index, setIndex] = useState(0);
  const [quote, setQuote] = useState(0);
  const [playing, setPlaying] = useState(true);

  const go = (dir: 1 | -1) => {
    setIndex((i) => (i + dir + IMAGES.length) % IMAGES.length);
    setQuote((q) => (q + dir + QUOTES.length) % QUOTES.length);
  };

  // restarts whenever the slide changes, so using the arrows never causes a double jump
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => go(1), SLIDE_MS);
    return () => clearTimeout(t);
  }, [index, playing]);

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Photos from the farm and campus"
      className="relative h-[56vh] min-h-[340px] w-full overflow-hidden rounded-3xl bg-ink"
    >
      <AnimatePresence initial={false}>
        <motion.img
          key={index}
          src={IMAGES[index]}
          alt={`Slide ${index + 1} of ${IMAGES.length}`}
          className="absolute inset-0 h-full w-full object-cover"
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: EASE }}
        />
      </AnimatePresence>

      <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

      <img src="/fodlog.png" alt="" className="absolute left-5 top-5 w-28 sm:left-8 sm:top-7 sm:w-44" />

      <button
        onClick={() => setPlaying((p) => !p)}
        aria-label={playing ? "Pause slideshow" : "Play slideshow"}
        className="absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full bg-black/35 text-white backdrop-blur transition-colors hover:bg-black/55 sm:right-8 sm:top-7"
      >
        {playing ? <Pause size={17} /> : <Play size={17} />}
      </button>

      <button
        onClick={() => go(-1)}
        aria-label="Previous slide"
        className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white backdrop-blur transition-colors hover:bg-black/55 sm:left-6"
      >
        <ChevronLeft size={22} />
      </button>
      <button
        onClick={() => go(1)}
        aria-label="Next slide"
        className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white backdrop-blur transition-colors hover:bg-black/55 sm:right-6"
      >
        <ChevronRight size={22} />
      </button>

      <div className="absolute inset-x-5 bottom-14 sm:inset-x-10 sm:bottom-16">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={quote}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="max-w-3xl font-display text-2xl font-semibold leading-tight text-white sm:text-4xl"
          >
            {QUOTES[quote]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* progress: the active segment fills while the slide is showing */}
      <div className="absolute inset-x-5 bottom-5 flex gap-1.5 sm:inset-x-10">
        {IMAGES.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setQuote((q) => (q + (i - index) + QUOTES.length * 8) % QUOTES.length);
              setIndex(i);
            }}
            aria-label={`Go to slide ${i + 1}`}
            aria-current={i === index}
            className="h-5 flex-1 py-2"
          >
            <span className="block h-1 w-full overflow-hidden rounded-full bg-white/30">
              {i < index && <span className="block h-full w-full bg-white" />}
              {i === index && (
                <motion.span
                  key={`${index}-${playing}`}
                  className="block h-full bg-white"
                  initial={{ width: playing ? "0%" : "100%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: playing ? SLIDE_MS / 1000 : 0, ease: "linear" }}
                />
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Slider;
