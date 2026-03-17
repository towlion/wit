"use client";

import { SHORTCUT_LIST } from "@/lib/shortcuts";

const sections = [
  { id: "getting-started", label: "Getting Started" },
  { id: "board-basics", label: "Board Basics" },
  { id: "shortcuts", label: "Keyboard Shortcuts" },
  { id: "search-filters", label: "Search & Filters" },
  { id: "views", label: "Views" },
  { id: "collaboration", label: "Collaboration" },
  { id: "tips", label: "Tips & Tricks" },
  { id: "resources", label: "More Resources" },
];

export default function HelpPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] mb-2">
        Help
      </h1>
      <p className="text-sm text-[var(--text-muted)] mb-8">
        Quick reference for using WIT. For the full guide, see the{" "}
        <a
          href="https://github.com/towlion/wit/blob/main/docs/user-guide.md"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--accent)] hover:underline"
        >
          documentation on GitHub
        </a>
        .
      </p>

      <nav className="flex flex-wrap gap-2 mb-10">
        {sections.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="text-xs px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-colors"
          >
            {s.label}
          </a>
        ))}
      </nav>

      <div className="space-y-8">
        {/* Getting Started */}
        <section id="getting-started" className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Getting Started</h2>
          </div>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            Create a <strong>workspace</strong> to organize your team, then add a <strong>project</strong> with your preferred template
            (Software, Home, or Event). Your project board is ready -- start adding items with the quick-create input or press <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] border border-[var(--border)] text-[var(--text-muted)]">n</kbd>.
          </p>
        </section>

        {/* Board Basics */}
        <section id="board-basics" className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Board Basics</h2>
          </div>
          <ul className="text-sm text-[var(--text-secondary)] space-y-2 leading-relaxed">
            <li><strong>Create items</strong> -- type in the quick-create input at the top of any column, or press <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] border border-[var(--border)] text-[var(--text-muted)]">n</kbd>.</li>
            <li><strong>Drag and drop</strong> -- move cards between columns to update status, or reorder within a column.</li>
            <li><strong>Card detail</strong> -- click a card (or press <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] border border-[var(--border)] text-[var(--text-muted)]">Enter</kbd>) to open the full detail panel with description, comments, subtasks, and more.</li>
            <li><strong>Priority &amp; labels</strong> -- set priority and labels from the detail panel to categorize your work.</li>
          </ul>
        </section>

        {/* Keyboard Shortcuts */}
        <section id="shortcuts" className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Keyboard Shortcuts</h2>
          </div>
          <div className="space-y-1.5">
            {SHORTCUT_LIST.map((s, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors">
                <span className="text-xs text-[var(--text-secondary)]">{s.description}</span>
                <kbd className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[var(--bg-tertiary)] border border-[var(--border)] text-[var(--text-muted)]">
                  {s.meta ? "Cmd+" : ""}{s.key}
                </kbd>
              </div>
            ))}
          </div>
        </section>

        {/* Search & Filters */}
        <section id="search-filters" className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Search & Filters</h2>
          </div>
          <ul className="text-sm text-[var(--text-secondary)] space-y-2 leading-relaxed">
            <li><strong>Quick search</strong> -- press <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] border border-[var(--border)] text-[var(--text-muted)]">Cmd+K</kbd> to search items by title across the workspace.</li>
            <li><strong>Filter bar</strong> -- filter by status, assignee, label, priority, or date range. Filters combine with AND logic.</li>
            <li><strong>Saved views</strong> -- save a filter combination as a named view for quick access from the sidebar.</li>
          </ul>
        </section>

        {/* Views */}
        <section id="views" className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Views</h2>
          </div>
          <ul className="text-sm text-[var(--text-secondary)] space-y-2 leading-relaxed">
            <li><strong>Board</strong> -- the default Kanban view with drag-and-drop columns.</li>
            <li><strong>Calendar</strong> -- items with due dates displayed on a monthly grid.</li>
            <li><strong>Dependency graph</strong> -- a DAG visualization of item dependencies with pan, zoom, and minimap.</li>
            <li><strong>Cross-project board</strong> -- view items from all projects in one unified board.</li>
          </ul>
        </section>

        {/* Collaboration */}
        <section id="collaboration" className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Collaboration</h2>
          </div>
          <ul className="text-sm text-[var(--text-secondary)] space-y-2 leading-relaxed">
            <li><strong>Comments</strong> -- add comments with markdown formatting on any work item.</li>
            <li><strong>@mentions</strong> -- type @ in a comment to mention a team member and send them a notification.</li>
            <li><strong>Watching</strong> -- click the eye icon on an item to receive notifications when it changes.</li>
            <li><strong>Notifications</strong> -- check the bell icon in the header; optionally enable email notifications in your profile.</li>
          </ul>
        </section>

        {/* Tips & Tricks */}
        <section id="tips" className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">Tips & Tricks</h2>
          </div>
          <ul className="text-sm text-[var(--text-secondary)] space-y-2 leading-relaxed">
            <li><strong>Subtasks</strong> -- break large items into checklists; progress shows on the board card.</li>
            <li><strong>Templates</strong> -- create item templates for recurring work (e.g., "Bug Report") to pre-fill fields.</li>
            <li><strong>Automation</strong> -- set rules to auto-assign or auto-label items when status changes.</li>
            <li><strong>Bulk operations</strong> -- select multiple items from the admin panel for batch updates.</li>
            <li><strong>CSV export</strong> -- export project data from the insights page for external analysis.</li>
          </ul>
        </section>

        {/* More Resources */}
        <section id="resources" className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">More Resources</h2>
          </div>
          <ul className="text-sm text-[var(--text-secondary)] space-y-2 leading-relaxed">
            <li>
              <a
                href="https://github.com/towlion/wit/blob/main/docs/user-guide.md"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--accent)] hover:underline"
              >
                Full User Guide
              </a>{" "}
              -- comprehensive documentation with all features and settings.
            </li>
            <li>
              <a
                href="/docs"
                className="text-[var(--accent)] hover:underline"
              >
                API Reference
              </a>{" "}
              -- OpenAPI documentation for programmatic access.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
