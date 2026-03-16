"use client";

interface FieldDefinition {
  id: number;
  name: string;
  field_type: string;
  options: Record<string, unknown> | null;
  required: boolean;
}

interface CustomFieldInputProps {
  field: FieldDefinition;
  value: { value_text?: string | null; value_number?: number | null; value_date?: string | null };
  onChange: (fieldId: number, data: { value_text?: string | null; value_number?: number | null; value_date?: string | null }) => void;
}

export default function CustomFieldInput({ field, value, onChange }: CustomFieldInputProps) {
  switch (field.field_type) {
    case "text":
      return (
        <input
          type="text"
          value={value.value_text || ""}
          onChange={(e) => onChange(field.id, { value_text: e.target.value || null })}
          placeholder={field.name}
          className="input-base py-1.5 text-xs"
        />
      );
    case "number":
      return (
        <input
          type="number"
          value={value.value_number ?? ""}
          onChange={(e) => onChange(field.id, { value_number: e.target.value ? parseFloat(e.target.value) : null })}
          placeholder={field.name}
          className="input-base py-1.5 text-xs"
        />
      );
    case "date":
      return (
        <input
          type="date"
          value={value.value_date || ""}
          onChange={(e) => onChange(field.id, { value_date: e.target.value || null })}
          className="input-base py-1.5 text-xs"
        />
      );
    case "select": {
      const choices = (field.options as { choices?: string[] })?.choices || [];
      return (
        <select
          value={value.value_text || ""}
          onChange={(e) => onChange(field.id, { value_text: e.target.value || null })}
          className="input-base py-1.5 text-xs"
        >
          <option value="">Select...</option>
          {choices.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      );
    }
    case "checkbox":
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={value.value_text === "true"}
            onChange={(e) => onChange(field.id, { value_text: e.target.checked ? "true" : "false" })}
            className="w-4 h-4 rounded border-[var(--border)] bg-[var(--bg-tertiary)] accent-[var(--accent)]"
          />
          <span className="text-xs text-[var(--text-secondary)]">{field.name}</span>
        </label>
      );
    default:
      return null;
  }
}
