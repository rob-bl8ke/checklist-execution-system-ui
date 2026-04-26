import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  computed,
  inject,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AiAssistantService, AiAssistantTargetType } from '../../services/ai-assistant.service';
import { LoadingSpinnerComponent } from '../loading-spinner/loading-spinner.component';

type PresetAction = { key: string; label: string };

@Component({
  selector: 'app-ai-assistant-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSpinnerComponent],
  templateUrl: './ai-assistant-panel.component.html',
  styleUrl: './ai-assistant-panel.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiAssistantPanelComponent implements OnInit, OnChanges {
  @Input() targetType: AiAssistantTargetType | null = null;
  @Input() targetId: number | null = null;

  protected readonly assistant = inject(AiAssistantService);
  readonly bodyChanged = output<{ body: string; source: 'apply' | 'revert'; proposalId: number }>();
  protected readonly presetActions: ReadonlyArray<PresetAction> = [
    { key: 'improve-note', label: 'Improve note' },
    { key: 'review-code', label: 'Review code' },
    { key: 'fix-markdown', label: 'Fix markdown' },
    { key: 'suggest-tags', label: 'Suggest tags' },
  ];
  protected readonly draftMessage = signal('');
  protected readonly copiedMessageId = signal<number | null>(null);
  protected readonly pendingProposals = computed(() =>
    this.assistant.proposals().filter((proposal) => proposal.status === 'PENDING'),
  );
  protected readonly lastAppliedProposal = computed(() => {
    const applied = this.assistant
      .proposals()
      .filter((proposal) => proposal.status === 'APPLIED' && proposal.appliedAt);
    if (applied.length === 0) {
      return null;
    }

    return [...applied].sort((left, right) =>
      (right.appliedAt ?? '').localeCompare(left.appliedAt ?? ''),
    )[0];
  });
  private lastHandledMutationNonce = 0;

  constructor() {
    effect(() => {
      const mutation = this.assistant.lastMutation();
      if (!mutation || mutation.nonce === this.lastHandledMutationNonce) {
        return;
      }

      this.lastHandledMutationNonce = mutation.nonce;
      this.bodyChanged.emit({
        body: mutation.body,
        source: mutation.kind,
        proposalId: mutation.proposalId,
      });
    });
  }

  ngOnInit(): void {
    if (this.assistant.providers().length === 0) {
      this.assistant.loadProviderStatus();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['targetType'] || changes['targetId']) && this.hasTarget()) {
      this.assistant.loadSession(this.targetType!, this.targetId!);
    }
  }

  protected sendMessage(): void {
    const message = this.draftMessage().trim();
    if (!message || !this.hasTarget()) {
      return;
    }

    this.assistant.sendMessage(this.targetType!, this.targetId!, { message });
    this.draftMessage.set('');
  }

  protected runAction(actionKey: string): void {
    if (!this.hasTarget()) {
      return;
    }

    this.assistant.runAction(this.targetType!, this.targetId!, actionKey);
  }

  protected clearHistory(): void {
    if (!this.hasTarget()) {
      return;
    }

    this.assistant.clearSession(this.targetType!, this.targetId!);
  }

  protected updateDraftMessage(value: string): void {
    this.draftMessage.set(value);
  }

  protected applyProposal(proposalId: number): void {
    this.assistant.applyProposal(proposalId);
  }

  protected revertProposal(proposalId: number): void {
    this.assistant.revertProposal(proposalId);
  }

  protected dismissProposal(proposalId: number): void {
    this.assistant.dismissProposal(proposalId);
  }

  protected revertLastAppliedProposal(): void {
    const proposal = this.lastAppliedProposal();
    if (!proposal) {
      return;
    }

    this.assistant.revertProposal(proposal.id);
  }

  protected proposalPreview(proposal: { proposedValue: string }): string {
    const preview = proposal.proposedValue.trim();
    if (!preview) {
      return 'No proposal preview available.';
    }

    return preview.length > 280 ? `${preview.slice(0, 280).trimEnd()}…` : preview;
  }

  protected messageRoleClass(role: string): string {
    return role === 'USER'
      ? 'border-blue-200 bg-blue-50 text-blue-950'
      : 'border-gray-200 bg-white text-gray-900';
  }

  protected copyMessage(messageId: number, content: string): void {
    navigator.clipboard.writeText(content).then(() => {
      this.copiedMessageId.set(messageId);
      window.setTimeout(() => {
        if (this.copiedMessageId() === messageId) {
          this.copiedMessageId.set(null);
        }
      }, 2000);
    });
  }

  private hasTarget(): boolean {
    return this.targetType !== null && this.targetId !== null;
  }
}
