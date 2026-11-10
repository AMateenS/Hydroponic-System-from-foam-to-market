"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Activity, Leaf, Settings, ShoppingCart } from "lucide-react";
import { ref, onValue } from "firebase/database";
import { useAuth } from "@/context/AuthContext";
import { database } from "@/lib/firebase";
import Slider from "@/components/Slider";
import SensorTank from "@/components/SensorTank";
import { CountUp, EASE, Stagger, StaggerItem } from "@/components/motion";

interface SensorData {
  temp: number;
  humidity: number;
  soil: number;
  uv?: number;
  timestamp?: number;
}

/** One headline line that rises out of a mask when the page loads */
const Line = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
  <span className="-mb-[0.14em] block overflow-hidden pb-[0.14em]">
    <motion.span
      className="block"
      initial={{ y: "105%" }}
      animate={{ y: 0 }}
      transition={{ duration: 0.85, ease: EASE, delay }}
    >
      {children}
    </motion.span>
  </span>
);

const Reading = ({
  label,
  value,
  decimals = 0,
  suffix = "",
}: {
  label: string;
  value: number | null;
  decimals?: number;
  suffix?: string;
}) => (
  <div className="px-5 py-8 first:pl-0 md:px-8">
    <p className="text-sm text-white/60">{label}</p>
    <p className="mt-2 font-display text-4xl font-bold tabular-nums md:text-5xl">
      {value === null ? "--" : <CountUp value={value} decimals={decimals} suffix={suffix} />}
    </p>
  </div>
);

const FEATURES = [
  {
    icon: Activity,
    title: "Live Monitoring",
    description: "Track pH, EC, temperature, and water levels in real time.",
  },
  {
    icon: Settings,
    title: "Smart Control",
    description: "Control pumps and nutrient flow with intelligent automation.",
  },
  {
    icon: Leaf,
    title: "Sustainable Growth",
    description: "Water-efficient, soil-free farming for higher yields.",
  },
  {
    icon: ShoppingCart,
    title: "Online Ordering",
    description: "Sell and order fresh hydroponic products directly.",
  },
];

const Home: React.FC = () => {
  const [sensor, setSensor] = useState<SensorData | null>(null);
  const { user } = useAuth();
  const role = user?.role;
  const userName = user?.username;

  // real-time sensor data from Firebase
  useEffect(() => {
    const sensorRef = ref(database, "sensor");
    const unsubscribe = onValue(sensorRef, (snapshot) => {
      if (!snapshot.exists()) return;
      setSensor(snapshot.val());
    });
    return () => unsubscribe();
  }, []);

  const soilPercent =
    sensor?.soil !== undefined ? Math.round(((4095 - sensor.soil) / 4095) * 100) : null;

  return (
    <div>
      {/* ---------------- HERO ---------------- */}
      <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-14 lg:grid-cols-[1.15fr_0.85fr] lg:py-24">
        <div>
          {userName && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="muted mb-4 text-sm font-medium"
            >
              Hi, {userName}
            </motion.p>
          )}

          <h1 className="font-display text-5xl font-bold leading-[1.02] tracking-tight md:text-7xl">
            <Line>Smart Hydroponic Farming</Line>
            <Line delay={0.12}>Fresh Food, Smarter Control</Line>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.5 }}
            className="muted mt-7 max-w-xl text-lg leading-relaxed"
          >
            Monitor, manage, and sell hydroponic crops with real-time intelligence. Control your farm remotely and
            deliver fresh products directly to customers.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.62 }}
            className="mt-9 flex flex-wrap gap-3"
          >
            <Link href="/products" className="btn btn-primary !px-7 !py-3.5 text-base">
              Buy Products
            </Link>
            {role === "admin" ? (
              <Link href="/admin/monitoring" className="btn btn-outline !px-7 !py-3.5 text-base">
                View Dashboard
              </Link>
            ) : user ? (
              <Link href="/orders" className="btn btn-outline !px-7 !py-3.5 text-base">
                My Orders
              </Link>
            ) : (
              <Link href="/signup" className="btn btn-outline !px-7 !py-3.5 text-base">
                Create an account
              </Link>
            )}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: EASE, delay: 0.3 }}
        >
          <SensorTank percent={soilPercent} live={sensor !== null} />
        </motion.div>
      </section>

      {/* ---------------- SLIDER ---------------- */}
      <section className="mx-auto max-w-7xl px-6">
        <Slider />
      </section>

      {/* ---------------- WHY ---------------- */}
      <section className="mx-auto max-w-7xl px-6 py-20 md:py-28">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <h2 className="self-start font-display text-3xl font-bold leading-tight md:text-5xl lg:sticky lg:top-28">
            Why Choose Our Hydroponic System?
          </h2>

          <Stagger className="divide-y divide-line border-y border-line">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <StaggerItem key={title} className="flex items-start gap-5 py-7">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                  <Icon size={24} />
                </span>
                <div>
                  <h3 className="font-display text-xl font-semibold">{title}</h3>
                  <p className="muted mt-1.5 leading-relaxed">{description}</p>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ---------------- LIVE SNAPSHOT ---------------- */}
      <section className="bg-ink text-white">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-3xl font-bold md:text-4xl">Live System Snapshot</h2>
            <p className="flex items-center gap-2 text-sm text-white/60">
              <span className={`h-2 w-2 rounded-full ${sensor ? "bg-green-400" : "bg-white/30"}`} />
              {sensor ? "Receiving live data" : "Waiting for the first reading"}
            </p>
          </div>

          <div className="mt-8 grid grid-cols-2 divide-white/10 border-t border-white/10 md:grid-cols-4 md:divide-x">
            <Reading label="Temperature" value={sensor?.temp ?? null} decimals={1} suffix="°C" />
            <Reading label="Humidity" value={sensor?.humidity ?? null} suffix="%" />
            <Reading label="EC Value" value={1.8} decimals={1} suffix=" mS/cm" />
            <Reading label="Soil Moisture" value={soilPercent} suffix="%" />
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
