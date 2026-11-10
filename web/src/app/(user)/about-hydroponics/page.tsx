"use client";
import React, { useEffect, useRef, useState } from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import { Droplets, ShieldCheck, Sprout, Sun } from "lucide-react";
import { API_URL } from "@/lib/config";
import { apiFetch } from "@/lib/api";
import { Stagger, StaggerItem, useReduced } from "@/components/motion";

interface Video {
  _id: string;
  title: string;
  url: string;
  description: string;
}

const STEPS = [
  {
    title: "Monitor the environment",
    text: "Our hydroponic system is designed using a smart combination of sensors, automation, and data-driven decision-making. Plants are grown in a controlled environment where all critical parameters such as pH level, nutrient concentration (EC), temperature, and humidity are continuously monitored.",
  },
  {
    title: "Stream data to the dashboard",
    text: "IoT sensors installed in the system collect real-time data and transmit it to our backend platform. This data is displayed on the web dashboard, allowing farmers and administrators to monitor the health of the crops remotely. Alerts are generated automatically when any parameter goes beyond safe limits.",
  },
  {
    title: "Automate the response",
    text: "Based on sensor readings, the system controls water circulation, nutrient flow, and environmental conditions to ensure optimal plant growth. This automation minimizes manual effort, reduces human error, and increases overall efficiency.",
  },
  {
    title: "Deliver the harvest",
    text: "Finally, the harvested produce is made available to customers through our online platform, where users can view products, place orders, and receive fresh hydroponic vegetables directly.",
  },
];

const IN_SHORT = [
  { icon: Sprout, text: "Plants grow without soil" },
  { icon: Droplets, text: "Far less water than traditional farming" },
  { icon: ShieldCheck, text: "No need for harmful pesticides" },
  { icon: Sun, text: "Year-round production, whatever the weather" },
];

const AboutHydroponics: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const reduce = useReduced();

  // the line beside the steps draws itself as you scroll down them
  const stepsRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: stepsRef, offset: ["start 70%", "end 60%"] });
  const lineScale = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });

  const fetchVideos = async () => {
    try {
      const response = await apiFetch(`${API_URL}/admin/get-videos`);
      const data = await response.json();
      if (response.ok) setVideos(data);
    } catch (error) {
      console.error("Error fetching videos:", error);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  // Convert YouTube links to embed links
  const getEmbedUrl = (url: any) => {
    if (!url) return "";
    if (url.includes("youtube.com/watch?v=")) return url.replace("watch?v=", "embed/");
    if (url.includes("youtu.be/")) return url.replace("youtu.be/", "www.youtube.com/embed/");
    return url;
  };

  return (
    <div>
      {/* ---------------- HEADER ---------------- */}
      <div className="mx-auto max-w-6xl px-6 pb-8 pt-16 md:pt-24">
        <h1 className="max-w-4xl font-display text-5xl font-bold leading-[1.04] tracking-tight md:text-7xl">
          About Hydroponic Farming
        </h1>
        <p className="muted mt-6 max-w-2xl text-lg">
          Smart, sustainable, and soil-free agriculture powered by technology
        </p>
      </div>

      {/* ---------------- WHAT IS ---------------- */}
      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-14 lg:grid-cols-[1.25fr_0.75fr]">
        <div>
          <h2 className="font-display text-3xl font-semibold md:text-4xl">What is Hydroponics?</h2>
          <div className="mt-6 space-y-5 text-[1.05rem] leading-8">
            <p>
              Hydroponics is an advanced agricultural technique in which plants are grown without soil by using
              mineral-rich nutrient solutions dissolved in water. Instead of relying on traditional soil-based
              farming, hydroponic systems deliver nutrients directly to plant roots, allowing faster growth, higher
              yields, and better control over environmental conditions.
            </p>
            <p>
              This method significantly reduces water consumption compared to conventional farming and eliminates
              the need for harmful pesticides. Because plants receive precise amounts of nutrients, hydroponics
              ensures consistent crop quality and year-round production regardless of weather conditions.
            </p>
            <p>
              Hydroponic farming is especially suitable for urban environments, greenhouses, and regions facing soil
              degradation or water scarcity. With the integration of IoT sensors and smart monitoring, hydroponics
              becomes a powerful solution for sustainable food production.
            </p>
          </div>
        </div>

        <aside className="self-start lg:sticky lg:top-28">
          <img
            src="/hydroponic.png"
            alt="Illustration of a hydroponic farm"
            className="mb-6 w-full max-w-xs rounded-2xl"
          />
          <Stagger className="space-y-3">
            {IN_SHORT.map(({ icon: Icon, text }) => (
              <StaggerItem key={text} className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                  <Icon size={18} />
                </span>
                <span className="text-sm font-medium">{text}</span>
              </StaggerItem>
            ))}
          </Stagger>
        </aside>
      </section>

      {/* ---------------- HOW IT WORKS (a real sequence) ---------------- */}
      <section className="bg-surface-2 py-20 md:py-28">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="font-display text-3xl font-semibold md:text-4xl">How Our Hydroponic System Works</h2>

          <div ref={stepsRef} className="relative mt-12 pl-12 md:pl-16">
            <div className="absolute bottom-2 left-[19px] top-2 w-0.5 bg-line-strong md:left-[23px]" />
            <motion.div
              className="absolute bottom-2 left-[19px] top-2 w-0.5 origin-top bg-green-600 md:left-[23px]"
              style={{ scaleY: reduce ? 1 : lineScale }}
            />

            <ol className="space-y-12">
              {STEPS.map((s, i) => (
                <li key={s.title} className="relative">
                  <span className="absolute -left-12 top-0 grid h-10 w-10 place-items-center rounded-full bg-green-600 font-display font-bold text-white md:-left-16 md:h-12 md:w-12">
                    {i + 1}
                  </span>
                  <h3 className="font-display text-xl font-semibold md:text-2xl">{s.title}</h3>
                  <p className="muted mt-2 leading-8">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ---------------- VIDEOS ---------------- */}
      <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <h2 className="font-display text-3xl font-semibold md:text-4xl">Our Hydroponic System in Action</h2>

        {videos.length === 0 ? (
          <p className="muted mt-8">Videos will appear here once the farm team adds them.</p>
        ) : (
          <>
            <div className="mt-10 grid gap-8 md:grid-cols-2">
              {videos.map((v) => (
                <figure key={v._id} className="surface overflow-hidden">
                  <iframe
                    className="aspect-video w-full"
                    src={getEmbedUrl(v.url)}
                    title={v.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                  {(v.title || v.description) && (
                    <figcaption className="p-4">
                      <p className="font-semibold">{v.title}</p>
                      {v.description && <p className="muted mt-1 text-sm">{v.description}</p>}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
            <p className="muted mt-8">
              These videos demonstrate our real-time monitoring, automation, and smart hydroponic farming setup.
            </p>
          </>
        )}
      </section>
    </div>
  );
};

export default AboutHydroponics;
