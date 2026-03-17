"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import type { WorkflowState, Label, ItemTemplate, AutomationRule, Workspace, Member, WorkItem, RecurrenceRule, Sprint, ProjectMember } from "@/lib/types";
import ImportModal from "@/components/ImportModal";
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
  const [newRuleTrigger, setNewRuleTrigger] = useState("status_enter");
  const [newRuleStateId, setNewRuleStateId] = useState("");
  const [newRuleTriggerLabelId, setNewRuleTriggerLabelId] = useState("");
  const [newRuleDaysBefore, setNewRuleDaysBefore] = useState("1");
  const [newRuleAction, setNewRuleAction] = useState("assign_user");
  const [newRuleConfigValue, setNewRuleConfigValue] = useState("");
  const [newRuleNotifyMessage, setNewRuleNotifyMessage] = useState("");
  const [newRuleLinkedTitle, setNewRuleLinkedTitle] = useState("");

  // Recurring items
  const [recurrences, setRecurrences] = useState<RecurrenceRule[]>([]);
  const [items, setItems] = useState<WorkItem[]>([]);
  const [newRecItemNumber, setNewRecItemNumber] = useState("");
  const [newRecFrequency, setNewRecFrequency] = useState("weekly");

  // Sprints
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [newSprintName, setNewSprintName] = useState("");
  const [newSprintStart, setNewSprintStart] = useState("");
  const [newSprintEnd, setNewSprintEnd] = useState("");
  const [newSprintGoal, setNewSprintGoal] = useState("");

  // Project members
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("editor");

  // Import modal
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    api.get<WorkflowState[]>(`${basePath}/states`).then(setStates);
    api.get<Label[]>(`${basePath}/labels`).then(setLabels);
    api.get<FieldDef[]>(`${basePath}/fields`).then(setFields).catch((e) => console.warn("Failed to load fields:", e.message));
    api.get<ItemTemplate[]>(`${basePath}/templates`).then(setTemplates).catch((e) => console.warn("Failed to load templates:", e.message));
    api.get<AutomationRule[]>(`${basePath}/automations`).then(setRules).catch((e) => console.warn("Failed to load automations:", e.message));
    api.get<{ members: Member[] }>(`/workspaces/${wsSlug}`).then((ws) => setMembers(ws.members)).catch((e) => console.warn("Failed to load members:", e.message));
    api.get<RecurrenceRule[]>(`${basePath}/recurrences`).then(setRecurrences).catch((e) => console.warn("Failed to load recurrences:", e.message));
    api.get<WorkItem[]>(`${basePath}/items`).then(setItems).catch((e) => console.warn("Failed to load items:", e.message));
    api.get<Sprint[]>(`${basePath}/sprints`).then(setSprints).catch((e) => console.warn("Failed to load sprints:", e.message));
    api.get<ProjectMember[]>(`${basePath}/project-members`).then(setProjectMembers).catch((e) => console.warn("Failed to load project members:", e.message));
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
    else if (newRuleAction === "move_to_state") actionConfig = { state_id: parseInt(newRuleConfigValue) };
    else if (newRuleAction === "notify_user") actionConfig = { user_id: parseInt(newRuleConfigValue), message: newRuleNotifyMessage };
    else if (newRuleAction === "create_linked_item") actionConfig = { title: newRuleLinkedTitle, state_id: parseInt(newRuleConfigValue) || null, priority: "medium" };

    let triggerConfig: Record<string, unknown> | null = null;
    if (newRuleTrigger === "label_added") triggerConfig = { label_id: parseInt(newRuleTriggerLabelId) };
    else if (newRuleTrigger === "due_date_approaching") triggerConfig = { days_before: parseInt(newRuleDaysBefore) || 1 };

    const rule = await api.post<AutomationRule>(`${basePath}/automations`, {
      name: newRuleName,
      trigger: newRuleTrigger,
      trigger_state_id: newRuleTrigger === "status_enter" ? (parseInt(newRuleStateId) || null) : null,
      trigger_config: triggerConfig,
      action: newRuleAction,
      action_config: actionConfig,
    });
    setRules([...rules, rule]);
    setNewRuleName("");
    setNewRuleStateId("");
    setNewRuleTriggerLabelId("");
    setNewRuleDaysBefore("1");
    setNewRuleConfigValue("");
    setNewRuleNotifyMessage("");
    setNewRuleLinkedTitle("");
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
    if (rule.action === "move_to_state") {
      const s = states.find((s) => s.id === config.state_id);
      return `Move to "${s?.name || config.state_id}"`;
    }
    if (rule.action === "notify_user") {
      const m = members.find((m) => m.user_id === config.user_id);
      return `Notify ${m?.display_name || `user #${config.user_id}`}`;
    }
    if (rule.action === "create_linked_item") return `Create linked item`;
    return rule.action;
  }

  function describeTrigger(rule: AutomationRule): string {
    if (rule.trigger === "label_added") {
      const tc = rule.trigger_config || {};
      const l = labels.find((l) => l.id === tc.label_id);
      return `When label "${l?.name || tc.label_id || "any"}" added`;
    }
    if (rule.trigger === "due_date_approaching") {
      const tc = rule.trigger_config || {};
      return `${tc.days_before || 1} days before due date`;
    }
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
      <section className="mb-8">
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
              value={newRuleTrigger}
              onChange={(e) => { setNewRuleTrigger(e.target.value); setNewRuleStateId(""); setNewRuleTriggerLabelId(""); }}
              className="input-base w-auto"
            >
              <option value="status_enter">When entering state</option>
              <option value="label_added">When label added</option>
              <option value="due_date_approaching">Due date approaching</option>
            </select>
          </div>
          <div className="flex gap-2">
            {newRuleTrigger === "status_enter" && (
              <select
                value={newRuleStateId}
                onChange={(e) => setNewRuleStateId(e.target.value)}
                required
                className="input-base flex-1"
              >
                <option value="">Select state...</option>
                {states.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
            {newRuleTrigger === "label_added" && (
              <select
                value={newRuleTriggerLabelId}
                onChange={(e) => setNewRuleTriggerLabelId(e.target.value)}
                required
                className="input-base flex-1"
              >
                <option value="">Select label...</option>
                {labels.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            )}
            {newRuleTrigger === "due_date_approaching" && (
              <input
                type="number"
                min="1"
                value={newRuleDaysBefore}
                onChange={(e) => setNewRuleDaysBefore(e.target.value)}
                className="input-base flex-1"
                placeholder="Days before"
              />
            )}
          </div>
          <div className="flex gap-2">
            <select
              value={newRuleAction}
              onChange={(e) => { setNewRuleAction(e.target.value); setNewRuleConfigValue(""); setNewRuleNotifyMessage(""); setNewRuleLinkedTitle(""); }}
              className="input-base w-auto"
            >
              <option value="assign_user">Assign user</option>
              <option value="add_label">Add label</option>
              <option value="set_priority">Set priority</option>
              <option value="move_to_state">Move to state</option>
              <option value="notify_user">Notify user</option>
              <option value="create_linked_item">Create linked item</option>
            </select>
            {(newRuleAction === "assign_user" || newRuleAction === "notify_user") && (
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
            {newRuleAction === "move_to_state" && (
              <select value={newRuleConfigValue} onChange={(e) => setNewRuleConfigValue(e.target.value)} required className="input-base flex-1">
                <option value="">Select state...</option>
                {states.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
            {newRuleAction === "create_linked_item" && (
              <input
                type="text"
                value={newRuleLinkedTitle}
                onChange={(e) => setNewRuleLinkedTitle(e.target.value)}
                placeholder="Linked item title"
                required
                className="input-base flex-1"
              />
            )}
            <button type="submit" className="btn-primary">Add</button>
          </div>
          {newRuleAction === "notify_user" && (
            <input
              type="text"
              value={newRuleNotifyMessage}
              onChange={(e) => setNewRuleNotifyMessage(e.target.value)}
              placeholder="Notification message"
              className="input-base w-full"
            />
          )}
        </form>
      </section>
      <div className="h-px bg-[var(--border)] mb-8" />

      {/* Recurring Items */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Recurring items</h2>
        <div className="space-y-2 mb-4">
          {recurrences.map((r) => (
            <div key={r.id} className="flex items-center justify-between p-3.5 card-surface">
              <div className="flex items-center gap-2.5 min-w-0">
                <button
                  onClick={async () => {
                    const updated = await api.patch<RecurrenceRule>(`${basePath}/recurrences/${r.id}`, { enabled: !r.enabled });
                    setRecurrences(recurrences.map((x) => (x.id === r.id ? updated : x)));
                  }}
                  className={`w-3 h-3 rounded-full shrink-0 transition-colors ${r.enabled ? "bg-green-500" : "bg-zinc-500"}`}
                  title={r.enabled ? "Enabled (click to disable)" : "Disabled (click to enable)"}
                />
                <span className="text-sm font-medium truncate">#{r.template_item_number} {r.template_title}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                  {r.frequency}
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">
                  Next: {r.next_run_at}
                </span>
              </div>
              <button
                onClick={async () => {
                  await api.delete(`${basePath}/recurrences/${r.id}`);
                  setRecurrences(recurrences.filter((x) => x.id !== r.id));
                }}
                className="text-xs text-red-400/70 hover:text-red-400 transition-colors shrink-0 ml-2"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const rule = await api.post<RecurrenceRule>(`${basePath}/recurrences`, {
              template_item_number: parseInt(newRecItemNumber),
              frequency: newRecFrequency,
            });
            setRecurrences([...recurrences, rule]);
            setNewRecItemNumber("");
          }}
          className="flex gap-2"
        >
          <select
            value={newRecItemNumber}
            onChange={(e) => setNewRecItemNumber(e.target.value)}
            required
            className="input-base flex-1"
          >
            <option value="">Select template item...</option>
            {items.filter((i) => !i.archived).map((i) => (
              <option key={i.id} value={i.item_number}>#{i.item_number} {i.title}</option>
            ))}
          </select>
          <select
            value={newRecFrequency}
            onChange={(e) => setNewRecFrequency(e.target.value)}
            className="input-base w-auto"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <button type="submit" className="btn-primary">Add</button>
        </form>
      </section>

      <div className="h-px bg-[var(--border)] mb-8" />

      {/* Sprints */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Sprints</h2>
        <div className="space-y-2 mb-4">
          {sprints.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-3.5 card-surface">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-sm font-medium truncate">{s.name}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                  s.status === "active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : s.status === "completed" ? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                    : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                }`}>
                  {s.status}
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">
                  {s.start_date} &mdash; {s.end_date}
                </span>
                <span className="text-[11px] text-[var(--text-muted)]">
                  {s.completed_count}/{s.item_count} done
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {s.status === "planning" && (
                  <button
                    onClick={async () => {
                      const updated = await api.patch<Sprint>(`${basePath}/sprints/${s.id}`, { status: "active" });
                      setSprints(sprints.map((x) => (x.id === s.id ? updated : x)));
                    }}
                    className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                  >
                    Start
                  </button>
                )}
                {s.status === "active" && (
                  <button
                    onClick={async () => {
                      const updated = await api.patch<Sprint>(`${basePath}/sprints/${s.id}`, { status: "completed" });
                      setSprints(sprints.map((x) => (x.id === s.id ? updated : x)));
                    }}
                    className="text-[10px] px-2 py-0.5 rounded bg-zinc-500/10 text-zinc-400 hover:bg-zinc-500/20 transition-colors"
                  >
                    Complete
                  </button>
                )}
                <button
                  onClick={async () => {
                    await api.delete(`${basePath}/sprints/${s.id}`);
                    setSprints(sprints.filter((x) => x.id !== s.id));
                  }}
                  className="text-xs text-red-400/70 hover:text-red-400 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const sprint = await api.post<Sprint>(`${basePath}/sprints`, {
              name: newSprintName,
              start_date: newSprintStart,
              end_date: newSprintEnd,
              goal: newSprintGoal || null,
            });
            setSprints([...sprints, sprint]);
            setNewSprintName("");
            setNewSprintStart("");
            setNewSprintEnd("");
            setNewSprintGoal("");
          }}
          className="space-y-2"
        >
          <div className="flex gap-2">
            <input type="text" value={newSprintName} onChange={(e) => setNewSprintName(e.target.value)} placeholder="Sprint name" required className="input-base flex-1" />
          </div>
          <div className="flex gap-2">
            <input type="date" value={newSprintStart} onChange={(e) => setNewSprintStart(e.target.value)} required className="input-base flex-1" />
            <input type="date" value={newSprintEnd} onChange={(e) => setNewSprintEnd(e.target.value)} required className="input-base flex-1" />
          </div>
          <div className="flex gap-2">
            <input type="text" value={newSprintGoal} onChange={(e) => setNewSprintGoal(e.target.value)} placeholder="Sprint goal (optional)" className="input-base flex-1" />
            <button type="submit" className="btn-primary">Add</button>
          </div>
        </form>
      </section>

      <div className="h-px bg-[var(--border)] mb-8" />

      {/* Project Members */}
      <section className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Project members</h2>
        <div className="space-y-2 mb-4">
          {projectMembers.map((pm) => (
            <div key={pm.user_id} className="flex items-center justify-between p-3.5 card-surface">
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-medium">{pm.display_name}</span>
                <span className="text-[11px] text-[var(--text-muted)]">{pm.email}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <select
                  value={pm.role}
                  onChange={async (e) => {
                    const updated = await api.patch<ProjectMember>(`${basePath}/project-members/${pm.user_id}`, { role: e.target.value });
                    setProjectMembers(projectMembers.map((x) => (x.user_id === pm.user_id ? updated : x)));
                  }}
                  className="input-base text-[10px] w-auto py-1"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  onClick={async () => {
                    await api.delete(`${basePath}/project-members/${pm.user_id}`);
                    setProjectMembers(projectMembers.filter((x) => x.user_id !== pm.user_id));
                  }}
                  className="text-xs text-red-400/70 hover:text-red-400 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const pm = await api.post<ProjectMember>(`${basePath}/project-members`, {
              email: newMemberEmail,
              role: newMemberRole,
            });
            setProjectMembers([...projectMembers, pm]);
            setNewMemberEmail("");
          }}
          className="flex gap-2"
        >
          <input type="email" value={newMemberEmail} onChange={(e) => setNewMemberEmail(e.target.value)} placeholder="Email" required className="input-base flex-1" />
          <select value={newMemberRole} onChange={(e) => setNewMemberRole(e.target.value)} className="input-base w-auto">
            <option value="viewer">Viewer</option>
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" className="btn-primary">Add</button>
        </form>
      </section>

      <div className="h-px bg-[var(--border)] mb-8" />

      {/* Data */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Data</h2>
        <div className="flex gap-2">
          <a
            href={`/api${basePath}/export.csv`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            Export CSV
          </a>
          <a
            href={`/api${basePath}/export.json`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            Export JSON
          </a>
          <button
            onClick={() => setShowImport(true)}
            className="btn-primary text-xs"
          >
            Import
          </button>
        </div>
      </section>

      {showImport && (
        <ImportModal
          basePath={basePath}
          onClose={() => setShowImport(false)}
          onImported={() => {
            api.get<WorkItem[]>(`${basePath}/items`).then(setItems);
          }}
        />
      )}
    </div>
  );
}
