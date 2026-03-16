export interface User {
  id: number;
  email: string;
  display_name: string;
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

export interface Project {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  template: string;
  item_counter: number;
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
  assignees: User[];
  labels: Label[];
}
