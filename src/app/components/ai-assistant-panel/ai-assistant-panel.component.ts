import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  computed,
  inject,
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
  protected readonly presetActions: ReadonlyArray<PresetAction> = [
    { key: 'improve-note', label: 'Improve note' },
    { key: 'review-code', label: 'Review code' },
    { key: 'fix-markdown', label: 'Fix markdown' },
    { key: 'suggest-tags', label: 'Suggest tags' },
  ];
  protected readonly draftMessage = signal('');
  protected readonly pendingProposals = computed(() =>
    this.assistant.proposals().filter((proposal) => proposal.status === 'PENDING'),
  );

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

  protected messageRoleClass(role: string): string {
    return role === 'USER'
      ? 'border-blue-200 bg-blue-50 text-blue-950'
      : 'border-gray-200 bg-white text-gray-900';
  }

  private hasTarget(): boolean {
    return this.targetType !== null && this.targetId !== null;
  }
}
