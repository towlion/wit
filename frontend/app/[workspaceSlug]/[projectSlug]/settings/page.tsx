"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type { WorkflowState, Label, ItemTemplate, AutomationRule, Workspace, Member } from "@/lib/types";
import { useAuth } from "@/lib/auth";

export default function ProjectSettingsPage() {
  const params = useParams();
  const wsSlug = params.workspaceSlug as string;
  const projectSlug = params.projectSlug as string;
  const basePath = `/workspaces/${wsSlug}/projects/${projectSlug}`;
  const { user } = useAuth();

  const [states, setStates] = useState<WorkflowState[]>([]);
  const [labels, setLabels] = useState<Label[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  interface FieldDef {
    id: number;
    project_id: number;
    name: string;
    field_type: string;
    options: Record<string, unknown> | null;
    required: boolean;
    position: number;
  }
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");

  const [newStateName, setNewStateName] = useState("");
  const [newStateCategory, setNewStateCategory] = useState("todo");
  const [newStateColor, setNewStateColor] = useState("#6b7280");

  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#6b7280");

  // Templates
  const [templates, setTemplates] = useState<ItemTemplate[]>([]);
  const [newTmplName, setNewTmplName] = useState("");
  const [newTmplTitle, setNewTmplTitle] = useState("");
  const [newTmplDesc, setNewTmplDesc] = useState("");
  const [newTmplPriority, setNewTmplPriority] = useState("medium");

  // Automation rules
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleStateId, setNewRuleStateId] = useState("");
  const [newRuleAction, setNewRuleAction] = useState("assign_user");
  const [newRuleConfigValue, setNewRuleConfigValue] = useState("");

  useEffect(() => {
    api.get<WorkflowState[]>(`${basePath}/states`).then(setStates);
    api.get<Label[]>(`${basePath}/labels`).then(setLabels);
    api.get<FieldDef[]>(`${basePath}/fields`).then(setFields).catch(() => {});
    api.get<ItemTemplate[]>(`${basePath}/templates`).then(setTemplates).catch(() => {});
    api.get<AutomationRule[]>(`${basePath}/automations`).then(setRules).catch(() => {});
    api.get<{ members: Member[] }>(`/workspaces/${wsSlug}`).then((ws) => setMembers(ws.members)).catch(() => {});
  }, [basePath, wsSlug]);

  async function addField(e: FormEvent) {
    e.preventDefault();
    const field = await api.post<FieldDef>(`${basePath}/fields`, {
      name: newFieldName,
      field_type: newFieldType,
      position: fields.length,
    });
    setFields([...fields, field]);
    setNewFieldName("");
  }

  async function deleteField(id: number) {
    await api.delete(`${basePath}/fields/${id}`);
    setFields(fields.filter((f) => f.id !== id));
  }

  async function addState(e: FormEvent) {
    e.preventDefault();
    const state = await api.post<WorkflowState>(`${basePath}/states`, {
      name: newStateName,
      category: newStateCategory,
      position: states.length,
      color: newStateColor,
    });
    setStates([...states, state]);
    setNewStateName("");
  }

  async function deleteState(id: number) {
    await api.delete(`${basePath}/states/${id}`);
    setStates(states.filter((s) => s.id !== id));
  }

  async function addLabel(e: FormEvent) {
    e.preventDefault();
    const label = await api.post<Label>(`${basePath}/labels`, {
      name: newLabelName,
      color: newLabelColor,
    });
    setLabels([...labels, label]);
    setNewLabelName("");
  }

  async function deleteLabel(id: number) {
    await api.delete(`${basePath}/labels/${id}`);
    setLabels(labels.filter((l) => l.id !== id));
  }

  async function addTemplate(e: FormEvent) {
    e.preventDefault();
    const tmpl = await api.post<ItemTemplate>(`${basePath}/templates`, {
      name: newTmplName,
      title_template: newTmplTitle,
      description_template: newTmplDesc || null,
      priority: newTmplPriority,
    });
    setTemplates([...templates, tmpl]);
    setNewTmplName("");
    setNewTmplTitle("");
    setNewTmplDesc("");
    setNewTmplPriority("medium");
  }

  async function deleteTemplate(id: number) {
    await api.delete(`${basePath}/templates/${id}`);
    setTemplates(templates.filter((t) => t.id !== id));
  }

  async function addRule(e: FormEvent) {
    e.preventDefault();
    let actionConfig: Record<string, unknown> = {};
    if (newRuleAction === "assign_user") actionConfig = { user_id: parseInt(newRuleConfigValue) };
    else if (newRuleAction === "add_label") actionConfig = { label_id: parseInt(newRuleConfigValue) };
    else if (newRuleAction === "set_priority") actionConfig = { priority: newRuleConfigValue };

    const rule = await api.post<AutomationRule>(`${basePath}/automations`, {
      name: newRuleName,
      trigger: "status_enter",
      trigger_state_id: parseInt(newRuleStateId) || null,
      action: newRuleAction,
      action_config: actionConfig,
    });
    setRules([...rules, rule]);
    setNewRuleName("");
    setNewRuleStateId("");
    setNewRuleConfigValue("");
  }

  async function deleteRule(id: number) {
    await api.delete(`${basePath}/automations/${id}`);
    setRules(rules.filter((r) => r.id !== id));
  }

  async function toggleRule(rule: AutomationRule) {
    const updated = await api.patch<AutomationRule>(`${basePath}/automations/${rule.id}`, {
      enabled: !rule.enabled,
    });
    setRules(rules.map((r) => (r.id === rule.id ? updated : r)));
  }

  function describeAction(rule: AutomationRule): string {
    const config = rule.action_config;
    if (rule.action === "assign_user") {
      const m = members.find((m) => m.user_id === config.user_id);
      return `Assign ${m?.display_name || `user #${config.user_id}`}`;
    }
    if (rule.action === "add_label") {
      const l = labels.find((l) => l.id === config.label_id);
      return `Add label "${l?.name || config.label_id}"`;
    }
    if (rule.action === "set_priority") return `Set priority to ${config.priority}`;
    return rule.action;
  }

  function describeTrigger(rule: AutomationRule): string {
    const s = states.find((s) => s.id === rule.trigger_state_id);
    return `When entering "${s?.name || "?"}"`;
  }

  return (
    <div className="p-6 max-w-2xl animate-fade-in">
      <h1 className="text-xl font-semibold tracking-tight mb-6">Project settings</h1>

      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Workflow states</h2>
        <div className="space-y-2 mb-4">
          {states.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between p-3.5 card-surface"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-3.5 h-3.5 rounded-full ring-2 ring-[var(--bg-secondary)]"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-sm font-medium">{s.name}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                  {s.category}
                </span>
              </div>
              <button
                onClick={() => deleteState(s.id)}
                className="text-xs text-red-400/70 hover:text-red-400 transition-colors"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
        <form onSubmit={addState} className="flex gap-2">
          <input
            type="text"
            value={newStateName}
            onChange={(e) => setNewStateName(e.target.value)}
            placeholder="State name"
            required
            className="input-base flex-1"
          />
          <select
            value={newStateCategory}
            onChange={(e) => setNewStateCategory(e.target.value)}
            className="input-base w-auto"
          >
            <option value="todo">Todo</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </select>
          <input
            type="color"
            value={newStateColor}
            onChange={(e) => setNewStateColor(e.target.value)}
            className="w-11 h-11 rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)] cursor-pointer p-1"
          />
          <button type="submit" className="btn-primary">
            Add
          </button>
        </form>
      </section>

      <div className="h-px bg-[var(--border)] mb-8" />

      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Labels</h2>
        <div className="space-y-2 mb-4">
          {labels.map((l) => (
            <div
              key={l.id}
              className="flex items-center justify-between p-3.5 card-surface"
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-3.5 h-3.5 rounded-full ring-2 ring-[var(--bg-secondary)]"
                  style={{ backgroundColor: l.color }}
                />
                <span className="text-sm font-medium">{l.name}</span>
              </div>
              <button
                onClick={() => deleteLabel(l.id)}
                className="text-xs text-red-400/70 hover:text-red-400 transition-colors"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
        <form onSubmit={addLabel} className="flex gap-2">
          <input
            type="text"
            value={newLabelName}
            onChange={(e) => setNewLabelName(e.target.value)}
            placeholder="Label name"
            required
            className="input-base flex-1"
          />
          <input
            type="color"
            value={newLabelColor}
            onChange={(e) => setNewLabelColor(e.target.value)}
            className="w-11 h-11 rounded-xl border border-[var(--border)] bg-[var(--bg-tertiary)] cursor-pointer p-1"
          />
          <button type="submit" className="btn-primary">
            Add
          </button>
        </form>
      </section>

      <div className="h-px bg-[var(--border)] mb-8" />

      {/* Custom Fields */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Custom fields</h2>
        <div className="space-y-2 mb-4">
          {fields.map((f) => (
            <div key={f.id} className="flex items-center justify-between p-3.5 card-surface">
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-medium">{f.name}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                  {f.field_type}
                </span>
              </div>
              <button onClick={() => deleteField(f.id)} className="text-xs text-red-400/70 hover:text-red-400 transition-colors">
                Delete
              </button>
            </div>
          ))}
        </div>
        <form onSubmit={addField} className="flex gap-2">
          <input
            type="text"
            value={newFieldName}
            onChange={(e) => setNewFieldName(e.target.value)}
            placeholder="Field name"
            required
            className="input-base flex-1"
          />
          <select value={newFieldType} onChange={(e) => setNewFieldType(e.target.value)} className="input-base w-auto">
            <option value="text">Text</option>
            <option value="number">Number</option>
            <option value="date">Date</option>
            <option value="select">Select</option>
            <option value="checkbox">Checkbox</option>
          </select>
          <button type="submit" className="btn-primary">Add</button>
        </form>
      </section>

      <div className="h-px bg-[var(--border)] mb-8" />

      {/* Item Templates */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Item templates</h2>
        <div className="space-y-2 mb-4">
          {templates.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-3.5 card-surface">
              <div className="flex items-center gap-2.5">
                <svg className="w-3.5 h-3.5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm font-medium">{t.name}</span>
                {t.title_template && (
                  <span className="text-[11px] text-[var(--text-muted)] truncate max-w-[120px]">
                    &ldquo;{t.title_template}&rdquo;
                  </span>
                )}
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                  {t.priority}
                </span>
              </div>
              <button onClick={() => deleteTemplate(t.id)} className="text-xs text-red-400/70 hover:text-red-400 transition-colors">
                Delete
              </button>
            </div>
          ))}
        </div>
        <form onSubmit={addTemplate} className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={newTmplName}
              onChange={(e) => setNewTmplName(e.target.value)}
              placeholder="Template name"
              required
              className="input-base flex-1"
            />
            <select value={newTmplPriority} onChange={(e) => setNewTmplPriority(e.target.value)} className="input-base w-auto">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <input
            type="text"
            value={newTmplTitle}
            onChange={(e) => setNewTmplTitle(e.target.value)}
            placeholder="Title template (optional)"
            className="input-base w-full"
          />
          <div className="flex gap-2">
            <input
              type="text"
              value={newTmplDesc}
              onChange={(e) => setNewTmplDesc(e.target.value)}
              placeholder="Description template (optional)"
              className="input-base flex-1"
            />
            <button type="submit" className="btn-primary">Add</button>
          </div>
        </form>
      </section>

      <div className="h-px bg-[var(--border)] mb-8" />

      {/* Automation Rules */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Automation rules</h2>
        <div className="space-y-2 mb-4">
          {rules.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-3.5 card-surface">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  onClick={() => toggleRule(r)}
                  className={`w-3 h-3 rounded-full shrink-0 transition-colors ${r.enabled ? "bg-green-500" : "bg-zinc-500"}`}
                  title={r.enabled ? "Enabled (click to disable)" : "Disabled (click to enable)"}
                />
                <span className="text-sm font-medium truncate">{r.name}</span>
                <span className="text-[11px] text-[var(--text-muted)] truncate">
                  {describeTrigger(r)} &rarr; {describeAction(r)}
                </span>
              </div>
              <button onClick={() => deleteRule(r.id)} className="text-xs text-red-400/70 hover:text-red-400 transition-colors shrink-0 ml-2">
                Delete
              </button>
            </div>
          ))}
        </div>
        <form onSubmit={addRule} className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={newRuleName}
              onChange={(e) => setNewRuleName(e.target.value)}
              placeholder="Rule name"
              required
              className="input-base flex-1"
            />
            <select
              value={newRuleStateId}
              onChange={(e) => setNewRuleStateId(e.target.value)}
              required
              className="input-base w-auto"
            >
              <option value="">When entering...</option>
              {states.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <select
              value={newRuleAction}
              onChange={(e) => { setNewRuleAction(e.target.value); setNewRuleConfigValue(""); }}
              className="input-base w-auto"
            >
              <option value="assign_user">Assign user</option>
              <option value="add_label">Add label</option>
              <option value="set_priority">Set priority</option>
            </select>
            {newRuleAction === "assign_user" && (
              <select value={newRuleConfigValue} onChange={(e) => setNewRuleConfigValue(e.target.value)} required className="input-base flex-1">
                <option value="">Select member...</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>{m.display_name}</option>
                ))}
              </select>
            )}
            {newRuleAction === "add_label" && (
              <select value={newRuleConfigValue} onChange={(e) => setNewRuleConfigValue(e.target.value)} required className="input-base flex-1">
                <option value="">Select label...</option>
                {labels.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            )}
            {newRuleAction === "set_priority" && (
              <select value={newRuleConfigValue} onChange={(e) => setNewRuleConfigValue(e.target.value)} required className="input-base flex-1">
                <option value="">Select priority...</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            )}
            <button type="submit" className="btn-primary">Add</button>
          </div>
        </form>
      </section>
    </div>
  );
}
