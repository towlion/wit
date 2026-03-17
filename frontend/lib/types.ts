export interface User {
  id: number;
  email: string;
  display_name: string;
  is_superuser?: boolean;
  created_at: string;
}

export interface WorkspaceListItem {
  id: number;
  name: string;
  slug: string;
  created_at: string;
  role: string;
}

export interface Member {
  user_id: number;
  email: string;
  display_name: string;
  role: string;
}

export interface Workspace {
  id: number;
  name: string;
  slug: string;
  created_at: string;
  members: Member[];
}

export interface CardDisplaySettings {
  show_priority: boolean;
  show_due_date: boolean;
  show_labels: boolean;
  show_assignees: boolean;
  show_description: boolean;
}

export interface BoardSettings {
  wip_limits: Record<string, number>;
  swimlane: "priority" | "assignee" | "label" | null;
  card_display: CardDisplaySettings;
}

export interface Project {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  template: string;
  item_counter: number;
  board_settings: BoardSettings | null;
  created_at: string;
}

export interface WorkflowState {
  id: number;
  project_id: number;
  name: string;
  category: string;
  position: number;
  color: string;
}

export interface Label {
  id: number;
  project_id: number;
  name: string;
  color: string;
}

export interface DependencyItem {
  item_id: number;
  item_number: number;
  title: string;
}

export interface WorkItem {
  id: number;
  project_id: number;
  item_number: number;
  title: string;
  description: string | null;
  status_id: number;
  priority: string;
  position: string;
  archived: boolean;
  created_by_id: number;
  created_at: string;
  due_date: string | null;
  assignees: User[];
  labels: Label[];
  blocks: DependencyItem[];
  blocked_by: DependencyItem[];
}

export interface ActivityEvent {
  id: number;
  work_item_id: number;
  user_id: number | null;
  event_type: string;
  body: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  user: User | null;
}

export interface WatchStatus {
  watching: boolean;
  watcher_count: number;
}

export interface SearchResult {
  item: WorkItem;
  headline: string;
  rank: number;
}

export interface Notification {
  id: number;
  user_id: number;
  work_item_id: number | null;
  event_type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

export interface ApiToken {
  id: number;
  name: string;
  token_prefix: string;
  expires_at: string | null;
  last_used_at: string | null;
  created_at: string;
}

export interface ApiTokenCreated extends ApiToken {
  token: string;
}

export interface AdminDashboard {
  total_users: number;
  active_users: number;
  total_workspaces: number;
  total_items: number;
  signups_last_7d: number;
}

export interface AdminUser {
  id: number;
  email: string;
  display_name: string;
  is_superuser: boolean;
  is_active: boolean;
  created_at: string;
  workspace_count: number;
}

export interface AdminWorkspace {
  id: number;
  name: string;
  slug: string;
  created_at: string;
  member_count: number;
  project_count: number;
  item_count: number;
}

export interface AdminAuditLogEntry {
  id: number;
  actor_id: number | null;
  action: string;
  entity_type: string;
  entity_id: number;
  details: Record<string, unknown> | null;
  created_at: string;
  actor: User | null;
}

export interface WorkspaceStats {
  items_total: number;
  items_last_7d: number;
  active_members: number;
  attachment_count: number;
  storage_bytes: number;
}

export interface BulkOperationResult {
  affected: number;
}

// --- Cross-Project ---
export interface CrossProjectItem {
  id: number;
  project_id: number;
  project_name: string;
  project_slug: string;
  item_number: number;
  title: string;
  description: string | null;
  status_name: string;
  status_category: string;
  status_color: string;
  priority: string;
  due_date: string | null;
  created_at: string;
  assignee_names: string[];
}

// --- Templates & Automation ---
export interface ItemTemplate {
  id: number;
  project_id: number;
  name: string;
  title_template: string;
  description_template: string | null;
  priority: string;
  label_ids: number[] | null;
  created_at: string;
}

export interface AutomationRule {
  id: number;
  project_id: number;
  name: string;
  trigger: string;
  trigger_state_id: number | null;
  action: string;
  action_config: Record<string, unknown>;
  enabled: boolean;
  created_at: string;
}

// --- Insights ---
export interface StatusDistributionItem {
  state_id: number;
  state_name: string;
  category: string;
  color: string;
  count: number;
}

export interface PriorityDistributionItem {
  priority: string;
  count: number;
}

export interface BurndownPoint {
  date: string;
  remaining: number;
}

export interface CycleTimeStats {
  avg_days: number | null;
  median_days: number | null;
  count: number;
}

export interface MemberBreakdownItem {
  user_id: number;
  display_name: string;
  items_created: number;
  items_completed: number;
  items_assigned: number;
}

export interface RecentlyCompletedItem {
  item_number: number;
  title: string;
  completed_at: string;
  completed_by: string | null;
}

export interface ProjectInsights {
  status_distribution: StatusDistributionItem[];
  priority_distribution: PriorityDistributionItem[];
  burndown: BurndownPoint[];
  cycle_time: CycleTimeStats;
  member_breakdown: MemberBreakdownItem[];
  recently_completed: RecentlyCompletedItem[];
}

export interface ProjectSummary {
  project_id: number;
  project_name: string;
  project_slug: string;
  total_items: number;
  completed_items: number;
  completion_rate: number;
}

export interface ActiveMemberSummary {
  user_id: number;
  display_name: string;
  events_count: number;
}

export interface ActivityTrendPoint {
  date: string;
  count: number;
}

export interface WorkspaceInsights {
  project_summaries: ProjectSummary[];
  most_active_members: ActiveMemberSummary[];
  activity_trend: ActivityTrendPoint[];
}
