"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Ban,
  BookOpen,
  BrainCircuit,
  Check,
  CheckCircle2,
  Database,
  Expand,
  FileText,
  Lightbulb,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  UserX,
} from "lucide-react";

const DURATION = 56;
const sceneEnds = [14, 24, 36, 46, 56];
const sceneNames = ["What's ahead", "Why it matters", "Build confidence", "Practice judgment", "Wrap up"];

const captionCues = [
  { start: 0, end: 6, text: "Before we jump in, here's what's ahead — a quick tour of your AUP learning experience." },
  { start: 6, end: 14, text: "You'll see why this policy matters, walk through the guidelines, practice your judgment, and wrap up with a quick reflection." },

  { start: 14, end: 17, text: "AI is changing how work gets done, and used well, it can make you faster and more effective." },
  { start: 17, end: 21, text: "But there are real risks: unapproved tools, sensitive data, inaccurate output, and skipped human review." },
  { start: 21, end: 24, text: "None of this is meant to scare you — these risks are common, and every one of them is preventable with the right awareness." },

  { start: 24, end: 27, text: "So how do you build that confidence? Start with what safeguards you and the organization." },
  { start: 27, end: 31, text: "Next is judgment — pausing to check before you act on something AI hands you." },
  { start: 31, end: 36, text: "Put those together and you get real confidence: clear rules that help you move faster, not slower." },

  { start: 36, end: 39, text: "Now let's put it into practice with a few real-world scenarios." },
  { start: 39, end: 43, text: "Each one touches a different risk area — sensitive information, approved tools, human review, output accuracy, and sharing outside the org." },
  { start: 43, end: 46, text: "These aren't designed to trip you up. They're here so you recognize these moments when they show up in your real work." },

  { start: 46, end: 51, text: "That's the overview of what's ahead in this experience." },
  { start: 51, end: 56, text: "Next you'll walk through the actual policy, try the practice scenarios yourself, and finish with a short reflection. Let's get started." },
];

const sceneAt = (time: number) => {
  const index = sceneEnds.findIndex((end) => time < end);
  return index < 0 ? sceneEnds.length - 1 : index;
};
const captionAt = (time: number) => {
  const cue = captionCues.find((c) => time >= c.start && time < c.end);
  return cue ? cue.text : captionCues[captionCues.length - 1].text;
};
const formatTime = (time: number) =>
  `${Math.floor(time / 60)}:${Math.floor(time % 60).toString().padStart(2, "0")}`;

function Background({ amber = false }: { amber?: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 opacity-[.045] [background-image:linear-gradient(rgba(255,255,255,.48)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.48)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(circle_at_center,black,transparent_82%)]" />
      <motion.div
        animate={{ x: [0, 34, 0], y: [0, -20, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className={`absolute -left-24 top-8 h-96 w-96 rounded-full blur-3xl ${amber ? "bg-amber-400/10" : "bg-blue-500/12"}`}
      />
      <motion.div
        animate={{ x: [0, -28, 0], y: [0, 18, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl"
      />
    </div>
  );
}

function FlowSummary() {
  const items = [
    { icon: FileText, label: "Why it matters" },
    { icon: BookOpen, label: "Policy walkthrough" },
    { icon: BrainCircuit, label: "Practice judgment" },
    { icon: CheckCircle2, label: "Wrap up" },
  ];

  return (
    <div className="relative flex h-full flex-col items-center justify-center px-28 pb-24 text-center">
      <Background />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative text-lg font-extrabold uppercase tracking-[.22em] text-amber-300">
        Your Learning Experience
      </motion.div>
      <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="relative mt-4 text-6xl font-extrabold">
        Here's what's ahead
      </motion.h1>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }} className="relative mt-4 text-xl text-slate-300">
        A clear path from policy awareness to confident action.
      </motion.p>

      <div className="relative mt-14 flex w-full items-start justify-center gap-10">
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 24, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.65 + index * 0.35, duration: 0.55 }}
              className="flex w-48 flex-col items-center justify-start text-center"
            >
              <motion.div
                animate={{
                  scale: [1, 1, 1.12, 1.12, 1],
                  y: [0, 0, -7, -7, 0],
                  backgroundColor: [
                    "rgba(59,130,246,.22)",
                    "rgba(59,130,246,.22)",
                    "rgba(37,99,235,1)",
                    "rgba(37,99,235,1)",
                    "rgba(59,130,246,.22)",
                  ],
                  boxShadow: [
                    "0 0 18px rgba(59,130,246,.12)",
                    "0 0 18px rgba(59,130,246,.12)",
                    "0 0 42px rgba(59,130,246,.7)",
                    "0 0 42px rgba(59,130,246,.7)",
                    "0 0 18px rgba(59,130,246,.12)",
                  ],
                }}
                transition={{ delay: 0.9 + index * 0.5, duration: 1.4 }}
                className="flex h-28 w-28 shrink-0 items-center justify-center rounded-3xl border-2 border-blue-300/50 bg-blue-500/20 text-white"
              >
                <Icon size={84} strokeWidth={3} />
              </motion.div>
              <motion.div
                animate={{ opacity: [0.65, 0.65, 1, 1, 0.65], y: [0, 0, -2, -2, 0] }}
                transition={{ delay: 0.9 + index * 0.5, duration: 1.4 }}
                className="mt-5 flex min-h-[52px] w-full items-start justify-center text-center text-lg font-bold leading-tight"
              >
                <span className="block max-w-[170px]">{item.label}</span>
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function WhyItMattersScene() {
  const cards = [
    { icon: Ban, title: "Tools", desc: "Not every AI tool is approved for work." },
    { icon: Database, title: "Data", desc: "Some info shouldn't leave the org." },
    { icon: AlertTriangle, title: "Output", desc: "AI can be confidently wrong." },
    { icon: UserX, title: "Decisions", desc: "Human review still matters." },
  ];

  return (
    <div className="relative flex h-full flex-col items-center justify-center px-24 pb-24 text-center">
      <Background amber />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative text-lg font-extrabold uppercase tracking-[.22em] text-amber-300">
        Why This Matters
      </motion.div>
      <motion.h2 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} className="relative mt-4 text-6xl font-extrabold leading-tight">
        AI is changing how work gets done.
      </motion.h2>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.65 }} className="relative mt-5 max-w-3xl text-xl leading-relaxed text-slate-300">
        A few risk areas are worth knowing.
      </motion.p>
      <div className="relative mt-9 grid w-[1180px] grid-cols-4 gap-5">
        {cards.map((card, index) => {
          const Icon = card.icon;
          const delay = 1.0 + index * 0.28;
          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, x: -40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay, duration: 0.5 }}
              className="rounded-3xl border border-white/10 bg-white/5 p-6 text-left"
            >
              <motion.div
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.22, 1] }}
                transition={{ delay: delay + 0.3, duration: 0.55 }}
                className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-300/30 bg-amber-400/10 text-amber-300"
              >
                <Icon size={28} />
              </motion.div>
              <div className="mt-4 text-xl font-extrabold">{card.title}</div>
              <div className="mt-2 text-sm leading-relaxed text-slate-400">{card.desc}</div>
            </motion.div>
          );
        })}
      </div>
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.1, duration: 0.6 }}
        className="relative mt-9 max-w-2xl text-xl font-semibold leading-relaxed text-white"
      >
        Understanding them is how we prevent them.
      </motion.div>
    </div>
  );
}

function ConfidenceScene() {
  const stages = [
    { label: "Safeguard", desc: "Protects your work and the org", color: "#378ADD", delay: 2.2 },
    { label: "Judgment", desc: "Pause and check before you act", color: "#EF9F27", delay: 4.6 },
    { label: "Confidence", desc: "Clear rules, faster decisions", color: "#5DCAA5", delay: 7.0 },
  ];
  const icons = [CheckCircle2, Lightbulb, Sparkles];
  const fillDuration = 8;

  return (
    <div className="relative flex h-full flex-col items-center px-20 pb-14 pt-10 text-center">
      <Background />
      <div className="relative text-lg font-extrabold uppercase tracking-[.22em] text-amber-300">Build confidence together</div>
      <h2 className="relative mt-3 text-6xl font-extrabold">Guidelines build confidence.</h2>
      <div className="relative mt-4 h-9 w-full max-w-2xl">
        <motion.p
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ delay: fillDuration + 0.9, duration: 0.4 }}
          className="absolute inset-x-0 text-2xl text-slate-300"
        >
          Follow them, and good judgment comes naturally.
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: fillDuration + 0.9, duration: 0.4 }}
          className="absolute inset-x-0 text-2xl text-slate-300"
        >
          Three things. One confident approach.
        </motion.p>
      </div>

      <div className="relative flex flex-1 items-center justify-center">
        <svg width="260" height="290" viewBox="0 0 80 90">
          <path
            d="M40 4 L74 16 L74 42 Q74 70 40 86 Q6 70 6 42 L6 16 Z"
            fill="rgba(255,255,255,.05)"
            stroke="rgba(255,255,255,.18)"
            strokeWidth="1.5"
          />
          <defs>
            <clipPath id="shield-clip">
              <path d="M40 4 L74 16 L74 42 Q74 70 40 86 Q6 70 6 42 L6 16 Z" />
            </clipPath>
            <linearGradient id="shield-grad" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#378ADD" />
              <stop offset="55%" stopColor="#EF9F27" />
              <stop offset="100%" stopColor="#5DCAA5" />
            </linearGradient>
          </defs>
          <motion.rect
            initial={{ height: 0, y: 86 }}
            animate={{ height: 84, y: 2 }}
            transition={{ delay: 0.6, duration: fillDuration, ease: "linear" }}
            x={6}
            width={68}
            fill="url(#shield-grad)"
            clipPath="url(#shield-clip)"
          />
          <motion.rect
            initial={{ y: 86, opacity: 1 }}
            animate={{ y: 2, opacity: 1 }}
            transition={{ delay: 0.6, duration: fillDuration, ease: "linear" }}
            x={0}
            height={3}
            width={80}
            fill="#ffffff"
            clipPath="url(#shield-clip)"
          />
          <motion.text
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: fillDuration + 0.7, duration: 0.3 }}
            x={40}
            y={52}
            textAnchor="middle"
            fontSize={22}
            fontWeight={700}
            fill="#fff"
          >
            ✓
          </motion.text>
        </svg>
      </div>

      <div className="relative flex w-full max-w-3xl gap-5">
        {stages.map((stage, index) => {
          const Icon = icons[index];
          return (
            <motion.div
              key={stage.label}
              initial={{ backgroundColor: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}
              animate={{ backgroundColor: "rgba(255,255,255,0.07)", borderColor: stage.color }}
              transition={{ delay: stage.delay, duration: 0.4 }}
              className="flex flex-1 flex-col items-center rounded-2xl border p-6"
            >
              <Icon size={28} style={{ color: stage.color }} />
              <motion.span
                initial={{ color: "#5a6274" }}
                animate={{ color: "#ffffff" }}
                transition={{ delay: stage.delay, duration: 0.4 }}
                className="mt-3 text-2xl font-extrabold"
              >
                {stage.label}
              </motion.span>
              <motion.span
                initial={{ color: "#5a6274" }}
                animate={{ color: "#cbd5e1" }}
                transition={{ delay: stage.delay, duration: 0.4 }}
                className="mt-1 text-sm font-medium"
              >
                {stage.desc}
              </motion.span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function KnowledgeScene() {
  const cards = ["Sensitive information", "Approved tools", "Human review", "Output accuracy", "External sharing"];
  return (
    <div className="relative flex h-full flex-col items-center justify-center px-24 pb-24 text-center">
      <Background />
      <div className="relative text-lg font-extrabold uppercase tracking-[.22em] text-amber-300">Practice judgment</div>
      <motion.h2 initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="relative mt-4 text-6xl font-extrabold">
        Let&rsquo;s test your knowledge
      </motion.h2>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="relative mt-4 max-w-3xl text-xl leading-relaxed text-slate-300">
        Real-world scenarios are here to help you stay safe in the practical moments that matter.
      </motion.p>
      <div className="relative mt-10 flex items-center gap-8">
        <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 2.5, repeat: Infinity }} className="flex h-32 w-32 items-center justify-center rounded-full border border-blue-300/25 bg-blue-500/15 text-blue-100">
          <BrainCircuit size={62} />
        </motion.div>
        <div className="relative h-64 w-[590px]">
          {cards.map((card, index) => (
            <motion.div
              key={card}
              initial={{ opacity: 0, x: 80, rotate: 4 }}
              animate={{ opacity: 1, x: index * 18, rotate: index - 1 }}
              transition={{ delay: 0.8 + index * 1.4, duration: 0.65 }}
              className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-white p-8 text-slate-900 shadow-2xl"
              style={{ zIndex: index + 1, transformOrigin: "bottom center" }}
            >
              <div className="text-sm font-extrabold uppercase tracking-wider text-blue-600">Practical scenario</div>
              <div className="mt-4 text-3xl font-extrabold">{card}</div>
              <div className="mt-5 flex items-center gap-4 text-2xl text-slate-300">
                <span>?</span>
                <span>&rarr;</span>
                <Lightbulb className="text-amber-500" />
                <span>&rarr;</span>
                <Check className="text-emerald-500" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WrapScene() {
  return (
    <div className="relative flex h-full flex-col items-center justify-center px-28 pb-24 text-center">
      <Background />
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="relative text-lg font-extrabold uppercase tracking-[.22em] text-amber-300">
        Your Experience Starts Now
      </motion.div>
      <motion.div
        initial={{ scale: 0.65, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative mt-6 flex h-40 w-40 items-center justify-center rounded-full border-[7px] border-blue-400 text-blue-300 shadow-2xl shadow-blue-500/20"
      >
        <motion.div animate={{ x: [0, 6, 0] }} transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}>
          <ArrowRight size={88} strokeWidth={2.4} />
        </motion.div>
      </motion.div>
      <motion.h2 initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="relative mt-7 text-6xl font-extrabold">
        Let&rsquo;s get started
      </motion.h2>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }} className="relative mt-5 max-w-3xl text-2xl leading-relaxed text-slate-300">
        Up next: a short walkthrough of the policy, a few real-world scenarios to test your judgment, and a quick reflection to wrap up.
      </motion.p>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.4 }} className="relative mt-8 flex items-center gap-4 rounded-2xl border border-blue-300/20 bg-blue-500/10 px-7 py-4 text-lg font-bold text-blue-100">
        <Sparkles className="text-amber-300" />
        Clear guidance. Practical judgment. Confident action.
      </motion.div>
    </div>
  );
}

export default function AUPWelcomeVideo() {
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [full, setFull] = useState(false);
  const [scale, setScale] = useState(1);
  const last = useRef<number | null>(null);
  const outer = useRef<HTMLDivElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const scene = sceneAt(elapsed);

  useEffect(() => {
    let id: number;
    const tick = (ts: number) => {
      if (last.current === null) last.current = ts;
      const delta = (ts - last.current) / 1000;
      last.current = ts;
      if (playing)
        setElapsed((value) => {
          const next = Math.min(DURATION, value + delta);
          if (next >= DURATION) setPlaying(false);
          return next;
        });
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [playing]);

  useEffect(() => {
    const resize = () => {
      if (shell.current) setScale(shell.current.clientWidth / 1600);
    };
    resize();
    const observer = new ResizeObserver(resize);
    if (shell.current) observer.observe(shell.current);
    window.addEventListener("resize", resize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, [full]);

  useEffect(() => {
    const handler = () => setFull(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const jump = (index: number) => {
    setElapsed(index ? sceneEnds[index - 1] : 0);
    setPlaying(false);
    last.current = null;
  };

  const toggleFull = async () => {
    if (!document.fullscreenElement) await outer.current?.requestFullscreen?.();
    else await document.exitFullscreen?.();
  };

  return (
    <main className="min-h-screen bg-[#e9e9e4] p-3 font-sans sm:p-5">
      <div ref={outer} className={`mx-auto flex w-full max-w-[1600px] flex-col bg-[#e9e9e4] ${full ? "h-screen max-w-none justify-center p-4" : ""}`}>
        <div ref={shell} className="relative aspect-video w-full overflow-hidden rounded-2xl bg-[#101722] shadow-2xl shadow-black/30">
          <div
            className="absolute left-0 top-0 h-[900px] w-[1600px] origin-top-left overflow-hidden border border-white/10 bg-gradient-to-b from-[#202a3d] to-[#101722] text-white"
            style={{ transform: `scale(${scale})` }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={scene}
                initial={{ opacity: 0, scale: 1.01 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.99 }}
                transition={{ duration: 0.55 }}
                className="absolute inset-0"
              >
                {scene === 0 ? <FlowSummary /> : scene === 1 ? <WhyItMattersScene /> : scene === 2 ? <ConfidenceScene /> : scene === 3 ? <KnowledgeScene /> : <WrapScene />}
              </motion.div>
            </AnimatePresence>
            <div className="absolute inset-x-0 bottom-0 z-50 flex h-[96px] items-end justify-center bg-gradient-to-t from-black/90 via-black/55 to-transparent px-24 pb-6 text-center text-lg">
              <AnimatePresence mode="wait">
                <motion.span key={captionAt(elapsed)} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                  {captionAt(elapsed)}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-slate-800">
          <button
            onClick={() => {
              setPlaying((value) => !value);
              last.current = null;
            }}
            className="flex items-center rounded-xl border bg-white px-4 py-2 text-sm font-bold"
          >
            {playing ? <Pause size={17} className="mr-2" /> : <Play size={17} className="mr-2" />}
            {playing ? "Pause" : "Play"}
          </button>
          <button
            onClick={() => {
              setElapsed(0);
              setPlaying(true);
              last.current = null;
            }}
            className="flex items-center rounded-xl border bg-white px-4 py-2 text-sm font-bold"
          >
            <RotateCcw size={17} className="mr-2" />
            Restart
          </button>
          <button onClick={toggleFull} className="flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">
            {full ? <Minimize size={17} className="mr-2" /> : <Expand size={17} className="mr-2" />}
            {full ? "Exit full screen" : "Full screen"}
          </button>
          <div className="h-2 min-w-[180px] flex-1 overflow-hidden rounded bg-[#d8d6cc]">
            <div className="h-full bg-blue-600" style={{ width: `${(elapsed / DURATION) * 100}%` }} />
          </div>
          <div className="min-w-[96px] text-right text-sm text-slate-600">
            {formatTime(elapsed)} / {formatTime(DURATION)}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {sceneNames.map((name, index) => (
            <button
              key={name}
              onClick={() => jump(index)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold ${scene === index ? "bg-blue-600 text-white" : "bg-[#dcdad0] text-slate-600"}`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
