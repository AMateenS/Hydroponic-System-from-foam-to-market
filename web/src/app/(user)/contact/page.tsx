"use client";
import React, { useState, useEffect } from "react";
import { MapPin, Mail, Phone } from "lucide-react";
import { API_URL, UPLOADS_URL } from "@/lib/config";
import { apiFetch } from "@/lib/api";
import { Stagger, StaggerItem } from "@/components/motion";
import { useToast } from "@/components/Toast";

interface Member {
  _id: string;
  name: string;
  role: string;
  image: string;
  description: string;
}
interface Sponsor {
  _id: string;
  name: string;
  image: string;
  description: string;
}

const supervisors = [
  {
    name: "Engr. Shahid Iqbal",
    role: "Project Supervisor",
    image: "/sir.png",
    description: "Provides academic guidance, technical supervision, and project evaluation.",
  },
];

const ContactAbout = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);

  const fetchMembers = async () => {
    try {
      const response = await apiFetch(`${API_URL}/admin/get-team-member`);
      const data = await response.json();
      if (response.ok) setMembers(data);
    } catch (error) {
      console.error("Error fetching members:", error);
    }
  };

  const fetchSponsors = async () => {
    try {
      const response = await apiFetch(`${API_URL}/admin/get-sponsors`);
      const data = await response.json();
      if (response.ok) setSponsors(data);
    } catch (error) {
      console.error("Error fetching sponsors:", error);
    }
  };

  useEffect(() => {
    fetchMembers();
    fetchSponsors();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const response = await apiFetch(`${API_URL}/auth/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (response.ok) {
        toast({ type: "ok", text: "Message sent. We will get back to you soon." });
        setFormData({ name: "", email: "", subject: "", message: "" });
      } else {
        toast({ type: "error", text: data.message || "Could not send your message. Please try again." });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({ type: "error", text: "Could not reach the server. Please try again." });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-14 md:py-20">
      <div className="grid gap-12 lg:grid-cols-[1.35fr_0.9fr]">
        {/* ---------------- ABOUT US ---------------- */}
        <div className="space-y-14">
          <section>
            <h1 className="font-display text-4xl font-bold leading-tight md:text-6xl">About Us</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8">
              AgroIntelliSense is a Final Year Project developed by BS Computer Engineering students. The system
              focuses on smart agriculture and hydroponic management using web technologies, IoT, and intelligent
              data analysis.
            </p>
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold md:text-3xl">Project Team</h2>
            {members.length === 0 ? (
              <p className="muted mt-4">Team members will appear here once they are added.</p>
            ) : (
              <Stagger className="mt-6 grid grid-cols-2 gap-x-5 gap-y-8 sm:grid-cols-3">
                {members.map((m) => (
                  <StaggerItem key={m._id}>
                    <img
                      src={`${UPLOADS_URL}/${m.image}`}
                      alt={m.name}
                      className="h-28 w-28 rounded-full object-cover ring-2 ring-line"
                    />
                    <h3 className="mt-3 font-display text-lg font-semibold">{m.name}</h3>
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">{m.role}</p>
                    <p className="muted mt-1.5 text-sm leading-relaxed">{m.description}</p>
                  </StaggerItem>
                ))}
              </Stagger>
            )}
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold md:text-3xl">Project Supervisor</h2>
            {supervisors.map((sup) => (
              <div key={sup.name} className="mt-6 flex items-center gap-5">
                <img src={sup.image} alt={sup.name} className="h-28 w-28 rounded-full object-cover ring-2 ring-line" />
                <div>
                  <p className="font-display text-lg font-semibold">{sup.name}</p>
                  <p className="text-sm font-medium text-green-700 dark:text-green-400">{sup.role}</p>
                  <p className="muted mt-1.5 max-w-md text-sm leading-relaxed">{sup.description}</p>
                </div>
              </div>
            ))}
          </section>

          <section>
            <h2 className="font-display text-2xl font-semibold md:text-3xl">Sponsors & Partners</h2>
            {sponsors.length === 0 ? (
              <p className="muted mt-4">Our sponsors will appear here once they are added.</p>
            ) : (
              <Stagger className="mt-6 grid gap-5 sm:grid-cols-2">
                {sponsors.map((sp) => (
                  <StaggerItem key={sp._id} className="surface flex items-center gap-4 p-4">
                    <img src={`${UPLOADS_URL}/${sp.image}`} alt={sp.name} className="h-14 w-14 shrink-0 object-contain" />
                    <div>
                      <p className="font-semibold">{sp.name}</p>
                      <p className="muted text-sm">{sp.description}</p>
                    </div>
                  </StaggerItem>
                ))}
              </Stagger>
            )}
          </section>
        </div>

        {/* ---------------- CONTACT FORM ---------------- */}
        <section className="self-start lg:sticky lg:top-24">
          <div className="surface p-6 sm:p-8">
            <h2 className="font-display text-2xl font-semibold">Contact Us</h2>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="label" htmlFor="c-name">Full Name</label>
                <input id="c-name" className="field" type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Enter your name" required />
              </div>
              <div>
                <label className="label" htmlFor="c-email">Email Address</label>
                <input id="c-email" className="field" type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Enter your email" required />
              </div>
              <div>
                <label className="label" htmlFor="c-subject">Subject</label>
                <input id="c-subject" className="field" type="text" name="subject" value={formData.subject} onChange={handleChange} placeholder="Subject" required />
              </div>
              <div>
                <label className="label" htmlFor="c-message">Message</label>
                <textarea id="c-message" className="field resize-none" name="message" rows={4} value={formData.message} onChange={handleChange} placeholder="Write your message..." required />
              </div>
              <button type="submit" disabled={sending} className="btn btn-primary w-full">
                {sending ? "Sending..." : "Send Message"}
              </button>
            </form>

            <ul className="mt-8 space-y-3 border-t border-line pt-6 text-sm">
              <li className="flex items-center gap-3">
                <MapPin size={17} className="text-green-600" /> Multan, Pakistan
              </li>
              <li className="flex items-center gap-3">
                <Mail size={17} className="text-green-600" /> support@agrointellisense.com
              </li>
              <li className="flex items-center gap-3">
                <Phone size={17} className="text-green-600" /> +92 3XX XXXXXXX
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ContactAbout;
