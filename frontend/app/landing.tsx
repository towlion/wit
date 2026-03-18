"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/* ────────────────────────────────────────────
   Animated dot grid background
   ──────────────────────────────────────────── */
function DotGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let mouseX = -1000;
    let mouseY = -1000;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };
    const handleMouseLeave = () => {
      mouseX = -1000;
      mouseY = -1000;
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("resize", resize);

    const gap = 32;
    const draw = () => {
      const w = canvas.offsetWidth;
      const h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      for (let x = gap; x < w; x += gap) {
        for (let y = gap; y < h; y += gap) {
          const dx = x - mouseX;
          const dy = y - mouseY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 120;
          const proximity = Math.max(0, 1 - dist / maxDist);

          const radius = 1 + proximity * 2;
          const alpha = 0.12 + proximity * 0.5;

          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fillStyle =
            proximity > 0
              ? `rgba(99, 102, 241, ${alpha})`
              : `rgba(161, 161, 170, ${alpha})`;
          ctx.fill();
        }
      }
      animationId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animationId);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-auto"
      style={{ opacity: 0.6 }}
    />
  );
}

/* ────────────────────────────────────────────
   Kanban board illustration
   ──────────────────────────────────────────── */
function BoardIllustration() {
  const columns = [
    {
      title: "To Do",
      color: "#71717a",
      cards: [
        { title: "Design system tokens", tag: "Design", tagColor: "#a78bfa" },
        { title: "API rate limiting", tag: "Backend", tagColor: "#34d399" },
      ],
    },
    {
      title: "In Progress",
      color: "#6366f1",
      cards: [
        {
          title: "User onboarding flow",
          tag: "Feature",
          tagColor: "#60a5fa",
          avatar: true,
        },
        { title: "Database migrations", tag: "Backend", tagColor: "#34d399" },
        {
          title: "Dashboard analytics",
          tag: "Feature",
          tagColor: "#60a5fa",
          avatar: true,
        },
      ],
    },
    {
      title: "Review",
      color: "#f59e0b",
      cards: [
        {
          title: "Auth integration tests",
          tag: "QA",
          tagColor: "#fb923c",
          avatar: true,
        },
      ],
    },
    {
      title: "Done",
      color: "#22c55e",
      cards: [
        { title: "CI/CD pipeline", tag: "DevOps", tagColor: "#2dd4bf" },
        { title: "Login & registration", tag: "Feature", tagColor: "#60a5fa" },
      ],
    },
  ];

  return (
    <div className="relative w-full max-w-[900px] mx-auto">
      {/* Glow behind the board */}
      <div className="absolute inset-0 -m-8 bg-indigo-500/[0.06] blur-[60px] rounded-3xl" />

      <div
        className="relative rounded-2xl border border-[var(--border)] overflow-hidden"
        style={{
          background:
            "linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-primary) 100%)",
        }}
      >
        {/* Title bar */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border)]">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          </div>
          <span className="text-[11px] text-[var(--text-muted)] ml-2 font-medium tracking-wide uppercase">
            Sprint 4 — Product Launch
          </span>
        </div>

        {/* Board columns */}
        <div className="grid grid-cols-4 gap-3 p-4">
          {columns.map((col, ci) => (
            <div key={ci} className="space-y-2">
              {/* Column header */}
              <div className="flex items-center gap-2 px-2 py-1.5">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: col.color }}
                />
                <span className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  {col.title}
                </span>
                <span className="text-[10px] text-[var(--text-muted)] ml-auto tabular-nums">
                  {col.cards.length}
                </span>
              </div>

              {/* Cards */}
              {col.cards.map((card, cardi) => (
                <div
                  key={cardi}
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] p-3 hover:border-[var(--border-hover)] transition-colors"
                  style={{
                    animationDelay: `${ci * 120 + cardi * 80}ms`,
                  }}
                >
                  <p className="text-[11px] font-medium text-[var(--text-primary)] leading-snug mb-2">
                    {card.title}
                  </p>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: card.tagColor + "18",
                        color: card.tagColor,
                      }}
                    >
                      {card.tag}
                    </span>
                    {card.avatar && (
                      <div className="w-4 h-4 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 ml-auto ring-1 ring-[var(--border)]" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   Feature card
   ──────────────────────────────────────────── */
function FeatureCard({
  icon,
  title,
  description,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="group relative p-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)]/60 backdrop-blur-sm
        hover:border-[var(--border-hover)] hover:bg-[var(--bg-secondary)] transition-all duration-300"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms, border-color 0.3s, background 0.3s`,
      }}
    >
      {/* Hover glow */}
      <div className="absolute inset-0 rounded-2xl bg-[var(--accent-glow)] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <div className="relative">
        <div className="w-10 h-10 rounded-xl bg-[var(--accent-subtle)] flex items-center justify-center mb-4 group-hover:bg-[var(--accent-glow)] transition-colors">
          {icon}
        </div>
        <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-1.5">
          {title}
        </h3>
        <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   Stat counter
   ──────────────────────────────────────────── */
function StatBlock({
  value,
  label,
  suffix,
}: {
  value: string;
  label: string;
  suffix?: string;
}) {
  return (
    <div className="text-center">
      <div className="text-4xl md:text-5xl font-bold tracking-tight text-[var(--text-primary)]">
        {value}
        {suffix && (
          <span className="text-[var(--accent)] text-3xl md:text-4xl">
            {suffix}
          </span>
        )}
      </div>
      <div className="text-[13px] text-[var(--text-muted)] mt-1.5 uppercase tracking-wider font-medium">
        {label}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   Icons (inline SVG)
   ──────────────────────────────────────────── */
const icons = {
  kanban: (
    <svg
      className="w-5 h-5 text-[var(--accent)]"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 4.5v15m6-15v15m-10.875 0h15.75c.621 0 1.125-.504 1.125-1.125V5.625c0-.621-.504-1.125-1.125-1.125H4.125C3.504 4.5 3 5.004 3 5.625v12.75c0 .621.504 1.125 1.125 1.125z"
      />
    </svg>
  ),
  sprint: (
    <svg
      className="w-5 h-5 text-[var(--accent)]"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
      />
    </svg>
  ),
  realtime: (
    <svg
      className="w-5 h-5 text-[var(--accent)]"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z"
      />
    </svg>
  ),
  fields: (
    <svg
      className="w-5 h-5 text-[var(--accent)]"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"
      />
    </svg>
  ),
  insights: (
    <svg
      className="w-5 h-5 text-[var(--accent)]"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
      />
    </svg>
  ),
  workload: (
    <svg
      className="w-5 h-5 text-[var(--accent)]"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
      />
    </svg>
  ),
};

/* ────────────────────────────────────────────
   LANDING PAGE
   ──────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden noise-bg">
      {/* ── NAV ── */}
      <nav className="relative z-20 flex items-center justify-between px-6 md:px-12 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <span className="text-white font-bold text-sm tracking-wider">
              W
            </span>
          </div>
          <span className="text-lg font-bold tracking-tight text-[var(--text-primary)]">
            WIT
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Sign in
          </Link>
          <Link href="/register" className="btn-primary text-sm">
            Get Started
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative pt-12 md:pt-20 pb-16 md:pb-28 px-6">
        {/* Interactive dot grid */}
        <div className="absolute inset-0 overflow-hidden">
          <DotGrid />
        </div>

        {/* Gradient orbs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-indigo-600/[0.07] rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-[200px] right-0 w-[400px] h-[400px] bg-violet-600/[0.05] rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-secondary)]/80 backdrop-blur-sm mb-8 animate-fade-in"
            style={{ animationDelay: "100ms", animationFillMode: "both" }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[12px] font-medium text-[var(--text-secondary)] tracking-wide">
              Self-hosted &middot; Open source &middot; GitHub-native
            </span>
          </div>

          {/* Headline */}
          <h1
            className="text-5xl md:text-7xl lg:text-[80px] font-extrabold tracking-[-0.035em] leading-[0.95] mb-6 animate-fade-in-up"
            style={{ animationDelay: "200ms", animationFillMode: "both" }}
          >
            Track work,
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
              ship faster.
            </span>
          </h1>

          {/* Subheadline */}
          <p
            className="text-lg md:text-xl text-[var(--text-muted)] max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up"
            style={{ animationDelay: "350ms", animationFillMode: "both" }}
          >
            A Kanban-powered project tracker built for teams that move fast.
            Sprints, real-time boards, custom fields, and deep analytics&thinsp;&mdash;&thinsp;all
            self-hosted on your own infrastructure.
          </p>

          {/* CTAs */}
          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-in-up"
            style={{ animationDelay: "500ms", animationFillMode: "both" }}
          >
            <Link
              href="/register"
              className="btn-primary px-8 py-3 text-base font-semibold flex items-center gap-2 group"
            >
              Start for free
              <svg
                className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </Link>
            <a
              href="https://github.com/towlion/wit"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary px-8 py-3 text-base font-medium flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              View on GitHub
            </a>
          </div>
        </div>

        {/* Board illustration */}
        <div
          className="relative z-10 mt-16 md:mt-24 max-w-5xl mx-auto px-4 animate-fade-in-up"
          style={{ animationDelay: "700ms", animationFillMode: "both" }}
        >
          <BoardIllustration />

          {/* Fade-out at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[var(--bg-primary)] to-transparent pointer-events-none" />
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="relative py-24 md:py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Everything your team needs
            </h2>
            <p className="text-[var(--text-muted)] text-lg max-w-xl mx-auto">
              Powerful project management that stays out of your way.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard
              icon={icons.kanban}
              title="Kanban Boards"
              description="Drag-and-drop cards across customizable columns. Swimlanes, WIP limits, and board views that adapt to your workflow."
              delay={0}
            />
            <FeatureCard
              icon={icons.sprint}
              title="Sprint Planning"
              description="Plan iterations with story points, velocity tracking, and burndown charts. Keep your team on pace."
              delay={80}
            />
            <FeatureCard
              icon={icons.realtime}
              title="Real-time Collaboration"
              description="See teammates' cursors, live status updates, and instant notifications. No stale data, no refresh needed."
              delay={160}
            />
            <FeatureCard
              icon={icons.fields}
              title="Custom Fields"
              description="Extend work items with text, number, date, and select fields. Track exactly what matters to your team."
              delay={240}
            />
            <FeatureCard
              icon={icons.insights}
              title="Deep Analytics"
              description="Cycle time, cumulative flow diagrams, priority distribution, and CSV exports. Data-driven decisions."
              delay={320}
            />
            <FeatureCard
              icon={icons.workload}
              title="Team Workload"
              description="Visualize capacity across projects. Balance assignments and prevent burnout with workload dashboards."
              delay={400}
            />
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="relative py-20 px-6">
        <div className="absolute inset-0 bg-[var(--bg-secondary)]/50" />
        <div className="absolute inset-0 border-y border-[var(--border)]" />

        <div className="relative max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10">
          <StatBlock value="0" suffix="ms" label="Vendor lock-in" />
          <StatBlock value="∞" label="Self-hosted" />
          <StatBlock value="100" suffix="%" label="Open Source" />
          <StatBlock value="<5" suffix="min" label="Setup time" />
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="relative py-24 md:py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              Deploy in minutes
            </h2>
            <p className="text-[var(--text-muted)] text-lg max-w-xl mx-auto">
              Fork, configure, push. GitHub Actions handles the rest.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                title: "Fork the repo",
                desc: "Start from the template. Your infrastructure, your rules.",
              },
              {
                step: "02",
                title: "Set secrets",
                desc: "Add your server credentials as GitHub secrets. That's the entire config.",
              },
              {
                step: "03",
                title: "Push & deploy",
                desc: "Blue-green deploys via GitHub Actions. Zero downtime, automatic rollback.",
              },
            ].map((item, i) => (
              <div key={i} className="relative group">
                {/* Connector line */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-8 left-[calc(100%+0.25rem)] w-[calc(1.5rem-0.5rem)] h-px bg-[var(--border)]" />
                )}
                <div className="p-6 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)]/40 hover:border-[var(--border-hover)] transition-colors">
                  <div className="text-[40px] font-black text-[var(--accent)]/20 leading-none mb-3 tracking-tighter">
                    {item.step}
                  </div>
                  <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-1.5">
                    {item.title}
                  </h3>
                  <p className="text-[13px] text-[var(--text-muted)] leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative py-24 md:py-32 px-6">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-indigo-600/[0.06] rounded-full blur-[140px] pointer-events-none" />
        </div>

        <div className="relative max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-5">
            Ready to ship?
          </h2>
          <p className="text-lg text-[var(--text-muted)] mb-10 max-w-lg mx-auto">
            Stop paying per seat. Own your project management.
            <br />
            Start tracking work in under five minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/register"
              className="btn-primary px-10 py-3.5 text-base font-semibold"
            >
              Create your account
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors px-4 py-3"
            >
              Already have an account? Sign in →
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-[var(--border)] py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <span className="text-white font-bold text-[9px]">W</span>
            </div>
            <span>WIT — Work Item Tracker</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-[var(--text-muted)]">
            <a
              href="https://github.com/towlion/wit"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--text-primary)] transition-colors"
            >
              GitHub
            </a>
            <a
              href="https://github.com/towlion/platform"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[var(--text-primary)] transition-colors"
            >
              Docs
            </a>
            <span>© {new Date().getFullYear()} Towlion</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
