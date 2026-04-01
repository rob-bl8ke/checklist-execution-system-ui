// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export interface Template {
  id: number;
  name: string;
  description: string | null;
  variablePrefix: string | null;
  variableSuffix: string | null;
  createdAt: string;
  updatedAt: string | null;
  stepCount?: number;
}

export interface TemplateStep {
  id: number;
  templateId: number;
  position: number;
  title: string;
  instructions: string | null;
  createdAt: string;
}

export interface CreateTemplateDto {
  name: string;
  description?: string;
  variablePrefix?: string;
  variableSuffix?: string;
}

export interface UpdateTemplateDto {
  name?: string;
  description?: string;
  variablePrefix?: string;
  variableSuffix?: string;
}

export interface CreateStepDto {
  title: string;
  instructions?: string;
}

export interface UpdateStepDto {
  title?: string;
  instructions?: string;
}

export interface MoveStepDto {
  beforeStepId?: number | null;
  afterStepId?: number | null;
}

// ---------------------------------------------------------------------------
// Instances
// ---------------------------------------------------------------------------

export type InstanceStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';

export interface InstanceStep {
  id: number;
  instanceId: number;
  stepOrder: number;
  title: string;
  instructionsTemplate: string | null;
  renderedInstructions: string | null;
  completed: boolean;
  completedAt: string | null;
  notes: string | null;
}

export interface InstanceSummary {
  id: number;
  name: string;
  status: InstanceStatus;
  createdAt: string;
  progress: { completed: number; total: number };
  nextStep: { id: number; title: string } | null;
}

export interface Instance extends InstanceSummary {
  templateId: number;
  variables: Record<string, string> | null;
  nextStepId: number | null;
  steps: InstanceStep[];
}

export interface CreateInstanceDto {
  templateId: number;
  name: string;
  variables?: Record<string, string>;
}

export interface CompleteStepDto {
  completed: boolean;
  notes?: string;
}

export interface UpdateInstanceStatusDto {
  status: InstanceStatus;
}

// ---------------------------------------------------------------------------
// Todos
// ---------------------------------------------------------------------------

export type TodoPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

export interface Todo {
  id: number;
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: TodoPriority;
  completed: boolean;
  createdAt: string;
  completedAt: string | null;
}

export interface CreateTodoDto {
  title: string;
  description?: string;
  dueDate?: string;
  priority?: TodoPriority;
}

export interface UpdateTodoDto {
  title?: string;
  description?: string | null;
  dueDate?: string | null;
  priority?: TodoPriority;
  completed?: boolean;
}

// ---------------------------------------------------------------------------
// Reminders
// ---------------------------------------------------------------------------

export type ReminderCadence = 'ONCE' | 'DAILY' | 'WEEKLY';
export type ReminderOccurrenceStatus = 'COMPLETED' | 'DISMISSED' | 'OPEN';

export interface ReminderDefinition {
  id: number;
  title: string;
  description: string | null;
  category: string | null;
  cadence: ReminderCadence;
  interval: number;
  anchorDate: string;
  weekdays: number[] | null;
  timeOfDay: string | null;
  leadTimeDays: number;
  linkedTemplateId: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface ReminderAgendaItem {
  reminderId: number;
  title: string;
  description: string | null;
  category: string | null;
  occurrenceDate: string;
  prepStartDate: string;
  timeOfDay: string | null;
  status: ReminderOccurrenceStatus;
  isInPrepWindow: boolean;
  isOverdue: boolean;
  daysUntilOccurrence: number;
  linkedTemplate: { id: number; name: string } | null;
  canStartRun: boolean;
}

export interface CreateReminderDto {
  title: string;
  description?: string;
  category?: string;
  cadence: ReminderCadence;
  interval?: number;
  anchorDate: string;
  weekdays?: number[];
  timeOfDay?: string;
  leadTimeDays?: number;
  linkedTemplateId?: number;
}

export interface UpdateReminderDto {
  title?: string;
  description?: string;
  category?: string;
  cadence?: ReminderCadence;
  interval?: number;
  anchorDate?: string;
  weekdays?: number[];
  timeOfDay?: string;
  leadTimeDays?: number;
  linkedTemplateId?: number;
  active?: boolean;
}

export interface UpdateReminderOccurrenceDto {
  status: ReminderOccurrenceStatus;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export interface DashboardNextStep {
  id: number;
  title: string;
  renderedInstructions: string | null;
}

export interface DashboardRun {
  id: number;
  name: string;
  progress: { completed: number; total: number };
  nextStep: DashboardNextStep | null;
}

export interface DashboardResponse {
  runs: DashboardRun[];
  todos: Todo[];
  reminders: {
    dueNow: ReminderAgendaItem[];
    upcoming: ReminderAgendaItem[];
  };
}
