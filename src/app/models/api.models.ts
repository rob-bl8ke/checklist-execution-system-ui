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

export interface TodoFilters {
  search: string;
  status: 'incomplete' | 'completed' | 'all';
  priority: TodoPriority[];
  dueDateFrom: string | null;
  dueDateTo: string | null;
  overdueOnly: boolean;
  sortField: 'dueDate' | 'priority' | 'createdAt' | 'title';
  sortDir: 'asc' | 'desc';
  page: number;
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
// Notes
// ---------------------------------------------------------------------------

export type AiProviderKey =
  | 'anthropic-api'
  | 'openai-api'
  | 'google-api'
  | 'claude-code-cli'
  | 'copilot-cli';

export interface NoteTag {
  id: number;
  noteId: number;
  tag: string;
}

export interface Note {
  id: number;
  title: string;
  body: string | null;
  variablePrefix: string | null;
  variableSuffix: string | null;
  aiEnabled: boolean;
  aiProviderKey: AiProviderKey | null;
  aiModel: string | null;
  aiPrompt: string | null;
  createdAt: string;
  updatedAt: string | null;
  tags?: NoteTag[];
}

export interface NoteVersion {
  id: number;
  noteId: number;
  title: string;
  body: string | null;
  versionNumber: number;
  createdAt: string;
}

export interface CreateNoteDto {
  title: string;
  body?: string;
  tags?: string[];
  variablePrefix?: string | null;
  variableSuffix?: string | null;
  aiEnabled?: boolean;
  aiProviderKey?: AiProviderKey | null;
  aiModel?: string | null;
  aiPrompt?: string | null;
}

export interface UpdateNoteDto {
  title?: string;
  body?: string;
  tags?: string[];
  variablePrefix?: string | null;
  variableSuffix?: string | null;
  aiEnabled?: boolean;
  aiProviderKey?: AiProviderKey | null;
  aiModel?: string | null;
  aiPrompt?: string | null;
}

export interface GenerateNoteDto {
  variables?: Record<string, string>;
}

export interface CreateNoteVersionDto {
  label?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

// ---------------------------------------------------------------------------
// AI
// ---------------------------------------------------------------------------

export type AiTransport = 'api' | 'cli';
export type AiMessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM';
export type AiProposalStatus = 'PENDING' | 'APPLIED' | 'REJECTED' | 'REVERTED';
export type AiFinishReason = 'STOP' | 'LENGTH' | 'ERROR' | 'UNSUPPORTED';
export type AiExpectedOutput = 'ADVICE_ONLY' | 'BODY_PROPOSAL_OR_ADVICE';

export interface SendAiMessageDto {
  message: string;
  providerKey?: AiProviderKey;
  model?: string;
  expectedOutput?: AiExpectedOutput;
}

export interface RunAiActionDto {
  providerKey?: AiProviderKey;
  model?: string;
  userInstruction?: string;
  expectedOutput?: AiExpectedOutput;
}

export interface AiCapabilitiesSummary {
  providerKey: AiProviderKey;
  available: boolean;
  transport: AiTransport;
  supportsChat: boolean;
  supportsPresetActions: boolean;
  supportsStructuredProposal: boolean;
  supportsStreaming: boolean;
  unavailableReason?: string;
}

export interface AiSession {
  id: number;
  targetType: string;
  targetId: number;
  providerKey: string;
  model: string | null;
  createdAt: string;
  updatedAt: string | null;
  clearedAt: string | null;
}

export interface AiMessage {
  id: number;
  role: AiMessageRole;
  content: string;
  presetActionKey: string | null;
  createdAt: string;
}

export interface AiProposal {
  id: number;
  status: AiProposalStatus;
  proposalType: string;
  fieldName: string;
  rationale: string | null;
  confidence: number | null;
  createdAt: string;
  appliedAt: string | null;
  revertedAt: string | null;
}

export interface AiInteractionProposal {
  id?: number;
  proposalType: string;
  fieldName: string;
  currentValue: string;
  proposedValue: string;
  rationale: string | null;
  confidence: number | null;
  status: AiProposalStatus;
}

export interface AiSessionResponse {
  session: AiSession;
  messages: AiMessage[];
  proposals: AiProposal[];
  capabilitiesSummary: AiCapabilitiesSummary;
}

export interface AiInteractionResponse {
  session: AiSession;
  assistantMessage: string;
  proposal: AiInteractionProposal | null;
  finishReason: AiFinishReason;
  capabilitiesSummary: AiCapabilitiesSummary;
}

export interface AiProposalMutationResult {
  id: number;
  status: AiProposalStatus;
  appliedAt: string | null;
  revertedAt: string | null;
}

export interface AiNoteVersionSnapshot {
  id: number;
  versionNumber: number;
  createdAt: string;
}

export interface AiProposalMutationResponse {
  proposal: AiProposalMutationResult;
  target: { targetType: 'NOTE'; targetId: number };
  noteVersion?: AiNoteVersionSnapshot;
}

export interface AiProviderStatus {
  providerKey: AiProviderKey;
  available: boolean;
  transport: AiTransport;
  supportsChat: boolean;
  supportsPresetActions: boolean;
  supportsStructuredProposal: boolean;
  supportsStreaming: boolean;
  supportedModels: string[];
  unavailableReason?: string;
}

export interface AiProviderStatusResponse {
  providers: AiProviderStatus[];
  defaultProviderKey?: AiProviderKey;
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
