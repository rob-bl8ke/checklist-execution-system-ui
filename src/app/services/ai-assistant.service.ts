import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { finalize } from 'rxjs';

import { environment } from '../../environments/environment';
import {
  AiCapabilitiesSummary,
  AiInteractionResponse,
  AiProposal,
  AiProposalMutationResponse,
  AiProviderKey,
  AiProviderStatus,
  AiProviderStatusResponse,
  AiSession,
  AiSessionResponse,
  RunAiActionDto,
  SendAiMessageDto,
} from '../models/api.models';

export type AiAssistantTargetType = 'NOTE';

@Injectable({ providedIn: 'root' })
export class AiAssistantService {
  private readonly http = inject(HttpClient);
  private readonly aiBase = `${environment.apiUrl}/ai`;

  readonly session = signal<AiSession | null>(null);
  readonly messages = signal<AiSessionResponse['messages']>([]);
  readonly proposals = signal<AiProposal[]>([]);
  readonly loading = signal(false);
  readonly capabilities = signal<AiCapabilitiesSummary | null>(null);
  readonly providers = signal<AiProviderStatus[]>([]);
  readonly defaultProviderKey = signal<AiProviderKey | null>(null);
  readonly error = signal<string | null>(null);

  readonly providerInfo = computed(() => {
    const session = this.session();
    if (!session) {
      return null;
    }

    return this.providers().find((provider) => provider.providerKey === session.providerKey) ?? null;
  });

  private currentTarget: { targetType: AiAssistantTargetType; targetId: number } | null = null;

  loadProviderStatus(): void {
    this.http.get<AiProviderStatusResponse>(`${this.aiBase}/providers/status`).subscribe({
      next: (response) => {
        this.providers.set(response.providers);
        this.defaultProviderKey.set(response.defaultProviderKey ?? null);
      },
      error: () => {
        this.providers.set([]);
        this.defaultProviderKey.set(null);
      },
    });
  }

  loadSession(targetType: AiAssistantTargetType, targetId: number): void {
    this.currentTarget = { targetType, targetId };
    this.loading.set(true);
    this.error.set(null);

    this.http
      .get<AiSessionResponse>(`${this.aiBase}/targets/${targetType}/${targetId}/session`)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (response) => this.applySessionResponse(response),
        error: (error: HttpErrorResponse) => {
          if (error.status === 404) {
            this.clearState();
            return;
          }

          this.error.set('Failed to load AI assistant session.');
        },
      });
  }

  sendMessage(targetType: AiAssistantTargetType, targetId: number, dto: SendAiMessageDto): void {
    this.currentTarget = { targetType, targetId };
    this.loading.set(true);
    this.error.set(null);

    this.http
      .post<AiInteractionResponse>(`${this.aiBase}/targets/${targetType}/${targetId}/messages`, dto)
      .subscribe({
        next: (response) => this.handleInteractionResponse(targetType, targetId, response),
        error: () => {
          this.loading.set(false);
          this.error.set('Failed to send AI assistant message.');
        },
      });
  }

  runAction(
    targetType: AiAssistantTargetType,
    targetId: number,
    actionKey: string,
    dto: RunAiActionDto = {},
  ): void {
    this.currentTarget = { targetType, targetId };
    this.loading.set(true);
    this.error.set(null);

    this.http
      .post<AiInteractionResponse>(
        `${this.aiBase}/targets/${targetType}/${targetId}/actions/${actionKey}`,
        dto,
      )
      .subscribe({
        next: (response) => this.handleInteractionResponse(targetType, targetId, response),
        error: () => {
          this.loading.set(false);
          this.error.set('Failed to run AI assistant action.');
        },
      });
  }

  clearSession(targetType: AiAssistantTargetType, targetId: number): void {
    this.currentTarget = { targetType, targetId };
    this.loading.set(true);
    this.error.set(null);

    this.http
      .delete<void>(`${this.aiBase}/targets/${targetType}/${targetId}/session`)
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => this.clearState(),
        error: () => this.error.set('Failed to clear AI assistant session.'),
      });
  }

  applyProposal(proposalId: number): void {
    this.loading.set(true);
    this.error.set(null);

    this.http
      .post<AiProposalMutationResponse>(`${this.aiBase}/proposals/${proposalId}/apply`, {})
      .subscribe({
        next: ({ proposal }) => {
          this.updateProposalStatus(proposal.id, proposal.status);
          this.reloadCurrentTarget();
        },
        error: () => {
          this.loading.set(false);
          this.error.set('Failed to apply AI proposal.');
        },
      });
  }

  revertProposal(proposalId: number): void {
    this.loading.set(true);
    this.error.set(null);

    this.http
      .post<AiProposalMutationResponse>(`${this.aiBase}/proposals/${proposalId}/revert`, {})
      .subscribe({
        next: ({ proposal }) => {
          this.updateProposalStatus(proposal.id, proposal.status);
          this.reloadCurrentTarget();
        },
        error: () => {
          this.loading.set(false);
          this.error.set('Failed to revert AI proposal.');
        },
      });
  }

  private handleInteractionResponse(
    targetType: AiAssistantTargetType,
    targetId: number,
    response: AiInteractionResponse,
  ): void {
    this.session.set(response.session);
    this.capabilities.set(response.capabilitiesSummary);
    this.upsertInteractionProposal(response.proposal);
    this.loadSession(targetType, targetId);
  }

  private reloadCurrentTarget(): void {
    if (!this.currentTarget) {
      return;
    }

    this.loadSession(this.currentTarget.targetType, this.currentTarget.targetId);
  }

  private applySessionResponse(response: AiSessionResponse): void {
    this.session.set(response.session);
    this.messages.set(response.messages);
    this.proposals.set(response.proposals);
    this.capabilities.set(response.capabilitiesSummary);
  }

  private clearState(): void {
    this.session.set(null);
    this.messages.set([]);
    this.proposals.set([]);
    this.capabilities.set(null);
  }

  private upsertInteractionProposal(proposal: AiInteractionResponse['proposal']): void {
    if (!proposal?.id) {
      return;
    }

    const proposalId = proposal.id;

    this.proposals.update((existing) => {
      const nextProposal: AiProposal = {
        id: proposalId,
        status: proposal.status,
        proposalType: proposal.proposalType,
        fieldName: proposal.fieldName,
        rationale: proposal.rationale,
        confidence: proposal.confidence,
        createdAt: new Date().toISOString(),
        appliedAt: null,
        revertedAt: null,
      };
      const index = existing.findIndex((item) => item.id === proposalId);
      if (index === -1) {
        return [nextProposal, ...existing];
      }

      const updated = [...existing];
      updated[index] = { ...updated[index], ...nextProposal };
      return updated;
    });
  }

  private updateProposalStatus(proposalId: number, status: AiProposal['status']): void {
    this.proposals.update((existing) =>
      existing.map((proposal) =>
        proposal.id === proposalId ? { ...proposal, status } : proposal,
      ),
    );
  }
}
