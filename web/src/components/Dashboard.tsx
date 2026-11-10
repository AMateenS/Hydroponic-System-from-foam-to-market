"use client";
import React, { useState, useEffect } from "react";
import { ref, onValue, query, limitToLast } from "firebase/database";
import { database } from "@/lib/firebase";
import { predictDisease } from "@/lib/diseaseApi";
import axios from "axios";
import {
  Thermometer,
  Droplets,
  Leaf,
  Sun,
  Activity,
  AlertTriangle,
  Upload,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/* ---------------- TYPES ---------------- */

interface ChartData {
  time: string;
  value: number;
}

interface StatCardProps {
  title: string;
  value: number | string;
  unit?: string;
  icon: LucideIcon;
}

interface SensorData {
  temp: number;
  humidity: number;
  soil: number;
  uv?: number;
  time: number;
}

/* ---------------- SMALL COMPONENT ---------------- */

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  unit,
  icon: Icon,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5 flex justify-between items-center">
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <h2 className="text-2xl font-bold">
          {value}
          {unit}
        </h2>
      </div>
      <Icon className="w-8 h-8 text-green-600" />
    </div>
  );
};

/* ---------------- DASHBOARD ---------------- */

const Dashboard: React.FC = () => {
  const [openModal, setOpenModal] = useState(false); // for image upload modal

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sensor, setSensor] = useState<SensorData | null>(null);
  const [temperatureData, setTemperatureData] = useState<ChartData[]>([]);
  const [moistureData, setMoistureData] = useState<ChartData[]>([]);

  // for realtime sensor data

  useEffect(() => {
    const sensorQuery = query(ref(database, "sensor_history"), limitToLast(10));

    const unsubscribe = onValue(sensorQuery, (snapshot) => {
      if (!snapshot.exists()) return;

      const data = snapshot.val() as Record<string, SensorData>;

      const readings: SensorData[] = Object.values(data);

      // Sort by timestamp
      readings.sort((a, b) => a.time - b.time);

      const tempFormatted: ChartData[] = readings.map((item) => ({
        time: new Date(item.time).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        value: item.temp,
      }));

      const moistureFormatted: ChartData[] = readings.map((item) => ({
        time: new Date(item.time).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        value: item.soil,
      }));

      setTemperatureData(tempFormatted);
      setMoistureData(moistureFormatted);

      // Latest reading for stat cards
      setSensor(readings[readings.length - 1]);
    });

    return () => unsubscribe();
  }, []);

  // Update handleImageUpload to save the file itself
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file); // Save the actual file object

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string); // For UI preview only
    };
    reader.readAsDataURL(file);
  };

  const handlePredict = async () => {
    if (!selectedFile) return alert("Please upload an image");

    setLoading(true);
    try {
      const result = await predictDisease(selectedFile);
      setResult(result);
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        alert(error.response?.data?.message || "Prediction failed");
      } else {
        alert("Unexpected error");
      }
    }

    setLoading(false);
  };

  const soilPercent =
    sensor?.soil !== undefined
      ? Math.round(((4095 - sensor.soil) / 4095) * 100)
      : 0;

  return (
    <div className="p-6 bg-white dark:bg-gray-900 dark:text-white space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-gray-500">
            AgroIntelliSense – Smart Agriculture Monitoring System
          </p>
        </div>

        <button
          onClick={() => setOpenModal(true)}
          className="px-4 py-2 cursor-pointer rounded-lg bg-green-600 hover:bg-green-700 text-white"
        >
          Check Plant Health
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Temperature"
          value={sensor?.temp ?? "--"}
          unit="°C"
          icon={Thermometer}
        />
        <StatCard
          title="Humidity"
          value={sensor?.humidity ?? "--"}
          unit="%"
          icon={Droplets}
        />
        <StatCard
          title="Soil Moisture"
          value={soilPercent}
          unit="%"
          icon={Leaf}
        />
        {/* <StatCard
                    title="UV Index"
                    value={sensor?.temperature ?? "--"}
                    unit="°C"
                    icon={Thermometer}
                /> */}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5">
          <h2 className="font-semibold mb-3">Temperature History</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={temperatureData}>
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5">
          <h2 className="font-semibold mb-3">Soil Moisture History</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={moistureData}>
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AI Disease Detection */}
      <div
        onClick={() => setOpenModal(true)}
        className="bg-white cursor-pointer dark:bg-gray-800 rounded-2xl shadow p-5"
      >
        <div className="flex items-center gap-2 mb-2">
          <Activity className="text-green-600" />
          <h2 className="text-xl font-semibold">AI Disease Detection</h2>
        </div>
        <p className="text-green-600 font-medium">
          ✔ Healthy Crop (Mock Result)
        </p>
        <p className="text-sm text-gray-500">
          Upload wheat leaf images to detect diseases.
        </p>
      </div>

      {/* Alerts */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow p-5">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="text-yellow-500" />
          <h2 className="text-xl font-semibold">Alerts</h2>
        </div>
        <ul className="text-sm space-y-1">
          {(soilPercent < 40 && (
            <li>⚠ Soil moisture below optimal level (Day soil)</li>
          )) ||
            (soilPercent > 45 && soilPercent < 60 && (
              <li>ℹ Soil moisture above optimal level</li>
            )) ||
            (soilPercent > 70 && (
              <li>⚠ Soil moisture above optimal level (Wet soil)</li>
            ))}
          {sensor?.temp && sensor.temp > 35 && (
            <li>🔥 High temperature detected</li>
          )}
          <li>ℹ System running normally</li>
        </ul>
      </div>

      {/* ================= MODAL ================= */}
      {openModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-5xl max-w-5xl shadow-lg">
            <h2 className="text-xl font-semibold mb-4"> Upload Plant Image </h2>
            <div className="flex gap-6">
              <div className="relative flex flex-col items-center justify-center w-full h-50 mb-4 border-dashed border-2 border-green-500 rounded-md bg-gray-100 dark:bg-gray-700 py-10 px-4 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600">
                <Upload className="w-8 h-8 mb-2 text-green-500" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <span className="text-center text-gray-700 dark:text-gray-200">
                  Click to upload an image
                </span>
              </div>
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className=" h-48 object-cover rounded-lg mb-4"
                />
              )}
            </div>
            {result && (
              <div className="mt-4 flex flex-wrap items-start gap-6">
                <div>
                  <h3 className="text-xl">
                    Disease:{" "}
                    <span className="text-green-600 text-xl font-bold">
                      {result.disease}
                    </span>{" "}
                  </h3>
                  <p className="txt-xl">
                    Confidence:{" "}
                    <span className="text-green-600 text-xl font-bold">
                      {result.confidence}%
                    </span>{" "}
                  </p>
                  <h4 className="text-lg text-green-600 mt-2 font-semibold">
                    Recommended Medicine:
                  </h4>
                  <ul>
                    {result.medicine.map((med: string, i: number) => (
                      <li key={i}>• {med}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-lg text-green-600 font-semibold">
                    Prevention Steps:
                  </h4>
                  <ul>
                    {result.prevention.map((step: string, i: number) => (
                      <li key={i}>✔ {step}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-lg text-green-600 font-semibold">
                    Recommended Fertilizer:
                  </h4>
                  <ul>
                    {result.fertilizer.map((fert: string, i: number) => (
                      <li key={i}>• {fert}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setOpenModal(false);
                  setImagePreview(null);
                  setResult(null);
                }}
                className="px-4 py-2 cursor-pointer rounded-md bg-gray-300 dark:bg-gray-600"
              >
                {" "}
                Cancel
              </button>
              <button
                onClick={handlePredict}
                className="px-4 py-2 cursor-pointer rounded-md bg-green-600 text-white"
              >
                {loading ? "Analyzing..." : "Detect Disease"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
