"use client";
import React, { useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import Sliderimg from "./Sliderimg";
import Productdata from "./Productdata";
import Teamdata from "./Teamdata";
import Sponserdata from "./Sponserdata";
import Vediodata from "./Vediodata";

type PanelType = "slide" | "product" | "video" | "team" | "sponsor";

const TABS: { id: PanelType; label: string }[] = [
  { id: "slide", label: "Slide images" },
  { id: "product", label: "Products" },
  { id: "video", label: "Videos" },
  { id: "team", label: "Team" },
  { id: "sponsor", label: "Sponsors" },
];

const AdminPanel: React.FC = () => {
  const [activePanel, setActivePanel] = useState<PanelType>("slide");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl font-bold md:text-4xl">Website content</h1>
      <p className="muted mt-2">Manage what visitors see on the website.</p>

      <LayoutGroup id="content-tabs">
        <div role="tablist" className="mt-8 flex gap-1 overflow-x-auto border-b border-line">
          {TABS.map((t) => {
            const active = activePanel === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => setActivePanel(t.id)}
                className={`relative whitespace-nowrap px-4 py-3 text-sm font-semibold transition-colors ${
                  active ? "text-green-700 dark:text-green-400" : "muted hover:text-fg"
                }`}
              >
                {t.label}
                {active && (
                  <motion.span
                    layoutId="content-tab-underline"
                    className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-green-600"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </LayoutGroup>

      <div className="surface mt-6 p-4 sm:p-6">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activePanel}
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -14 }}
            transition={{ duration: 0.2 }}
          >
            {activePanel === "slide" && <Sliderimg />}
            {activePanel === "product" && <Productdata />}
            {activePanel === "video" && <Vediodata />}
            {activePanel === "team" && <Teamdata />}
            {activePanel === "sponsor" && <Sponserdata />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AdminPanel;
