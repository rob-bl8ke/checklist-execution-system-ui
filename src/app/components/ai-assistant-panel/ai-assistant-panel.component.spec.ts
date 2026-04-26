import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { AiAssistantPanelComponent } from './ai-assistant-panel.component';
import { AiAssistantService } from '../../services/ai-assistant.service';

describe('AiAssistantPanelComponent', () => {
  let fixture: ComponentFixture<AiAssistantPanelComponent>;
  let component: AiAssistantPanelComponent;
  let service: jasmine.SpyObj<AiAssistantService> & {
    session: ReturnType<typeof signal>;
    messages: ReturnType<typeof signal>;
    proposals: ReturnType<typeof signal>;
    loading: ReturnType<typeof signal>;
    capabilities: ReturnType<typeof signal>;
    providers: ReturnType<typeof signal>;
    defaultProviderKey: ReturnType<typeof signal>;
    error: ReturnType<typeof signal>;
    providerInfo: ReturnType<typeof signal>;
  };

  beforeEach(async () => {
    service = Object.assign(
      jasmine.createSpyObj<AiAssistantService>('AiAssistantService', [
        'loadProviderStatus',
        'loadSession',
        'sendMessage',
        'runAction',
        'clearSession',
        'applyProposal',
        'revertProposal',
        'dismissProposal',
      ]),
      {
        session: signal(null),
        messages: signal([]),
        proposals: signal([]),
        loading: signal(false),
        capabilities: signal(null),
        providers: signal([]),
        defaultProviderKey: signal('openai-api'),
        error: signal(null),
        providerInfo: signal(null),
        lastMutation: signal(null),
      },
    );

    await TestBed.configureTestingModule({
      imports: [AiAssistantPanelComponent],
      providers: [{ provide: AiAssistantService, useValue: service }],
    }).compileComponents();

    fixture = TestBed.createComponent(AiAssistantPanelComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('targetType', 'NOTE');
    fixture.componentRef.setInput('targetId', 3);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load provider status on init and load the target session from inputs', () => {
    expect(service.loadProviderStatus).toHaveBeenCalled();
    expect(service.loadSession).toHaveBeenCalledWith('NOTE', 3);
  });

  it('should render an empty state when no session exists', () => {
    expect(fixture.nativeElement.textContent).toContain('No AI session exists yet');
  });

  it('should send a message using the current target inputs', () => {
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('#ai-assistant-message');
    textarea.value = 'Review this';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const sendButton = buttons.find((button) => button.textContent?.trim() === 'Send');
    expect(sendButton).toBeDefined();
    sendButton!.click();

    expect(service.sendMessage).toHaveBeenCalledWith('NOTE', 3, { message: 'Review this' });
  });

  it('should run preset actions using the current target inputs', () => {
    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const improveNoteButton = buttons.find((button) => button.textContent?.trim() === 'Improve note');
    expect(improveNoteButton).toBeDefined();

    improveNoteButton!.click();

    expect(service.runAction).toHaveBeenCalledWith('NOTE', 3, 'improve-note');
  });

  it('should render message history, proposal cards, and provider info', () => {
    service.session.set({
      id: 9,
      targetType: 'NOTE',
      targetId: 3,
      providerKey: 'openai-api',
      model: 'gpt-4.1-mini',
      createdAt: '',
      updatedAt: null,
      clearedAt: null,
    });
    service.providerInfo.set({
      providerKey: 'openai-api',
      available: true,
      transport: 'api',
      supportsChat: true,
      supportsPresetActions: true,
      supportsStructuredProposal: true,
      supportsStreaming: false,
      supportedModels: ['gpt-4.1-mini'],
    });
    service.capabilities.set({
      providerKey: 'openai-api',
      available: true,
      transport: 'api',
      supportsChat: true,
      supportsPresetActions: true,
      supportsStructuredProposal: true,
      supportsStreaming: false,
    });
    service.messages.set([
      { id: 1, role: 'USER', content: 'Hi', presetActionKey: null, createdAt: '' },
      { id: 2, role: 'ASSISTANT', content: 'Hello', presetActionKey: 'review-code', createdAt: '' },
    ]);
    service.proposals.set([
      {
        id: 7,
        status: 'PENDING',
        proposalType: 'BODY_REWRITE',
        fieldName: 'body',
        currentValue: 'Before',
        proposedValue: 'After body from AI',
        rationale: 'This is clearer.',
        confidence: 0.7,
        createdAt: '',
        appliedAt: null,
        revertedAt: null,
      },
    ]);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Provider: openai-api');
    expect(text).toContain('Model: gpt-4.1-mini');
    expect(text).toContain('Hello');
    expect(text).toContain('BODY_REWRITE');
    expect(text).toContain('This is clearer.');
    expect(text).toContain('After body from AI');
  });

  it('should copy assistant response messages to the clipboard with feedback', async () => {
    const clipboardSpy = jasmine.createSpy('writeText').and.returnValue(Promise.resolve());
    spyOnProperty(navigator, 'clipboard', 'get').and.returnValue(
      { writeText: clipboardSpy } as unknown as Clipboard,
    );
    service.messages.set([
      { id: 1, role: 'USER', content: 'User text', presetActionKey: null, createdAt: '' },
      { id: 2, role: 'ASSISTANT', content: 'Assistant text', presetActionKey: null, createdAt: '' },
    ]);
    fixture.detectChanges();

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const copyButton = buttons.find((button) => button.textContent?.trim() === 'Copy');
    expect(copyButton).toBeDefined();

    copyButton!.click();
    await Promise.resolve();
    fixture.detectChanges();

    expect(clipboardSpy).toHaveBeenCalledWith('Assistant text');
    expect(copyButton!.textContent?.trim()).toBe('Copied');
  });

  it('should show the loading spinner during AI calls', () => {
    service.loading.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('AI assistant working');
  });

  it('should apply and dismiss pending proposals', () => {
    service.proposals.set([
      {
        id: 7,
        status: 'PENDING',
        proposalType: 'BODY_REWRITE',
        fieldName: 'body',
        currentValue: 'Before',
        proposedValue: 'After',
        rationale: 'Sharper wording.',
        confidence: 0.8,
        createdAt: '',
        appliedAt: null,
        revertedAt: null,
      },
    ]);
    fixture.detectChanges();

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const applyButton = buttons.find((button) => button.textContent?.trim() === 'Apply');
    const dismissButton = buttons.find((button) => button.textContent?.trim() === 'Dismiss');
    expect(applyButton).toBeDefined();
    expect(dismissButton).toBeDefined();

    applyButton!.click();
    dismissButton!.click();

    expect(service.applyProposal).toHaveBeenCalledWith(7);
    expect(service.dismissProposal).toHaveBeenCalledWith(7);
  });

  it('should show a revert-last button for the most recently applied proposal', () => {
    service.proposals.set([
      {
        id: 5,
        status: 'APPLIED',
        proposalType: 'BODY_REWRITE',
        fieldName: 'body',
        currentValue: 'Before',
        proposedValue: 'After',
        rationale: 'Sharper wording.',
        confidence: 0.8,
        createdAt: '',
        appliedAt: '2026-04-24T12:00:00.000Z',
        revertedAt: null,
      },
      {
        id: 4,
        status: 'APPLIED',
        proposalType: 'BODY_REWRITE',
        fieldName: 'body',
        currentValue: 'Older',
        proposedValue: 'Old applied',
        rationale: 'Older change.',
        confidence: 0.6,
        createdAt: '',
        appliedAt: '2026-04-24T10:00:00.000Z',
        revertedAt: null,
      },
    ]);
    fixture.detectChanges();

    const buttons = Array.from(fixture.nativeElement.querySelectorAll('button')) as HTMLButtonElement[];
    const revertButton = buttons.find((button) => button.textContent?.trim() === 'Revert last AI change');
    expect(revertButton).toBeDefined();

    revertButton!.click();

    expect(service.revertProposal).toHaveBeenCalledWith(5);
  });

  it('should emit body updates when proposal mutations succeed', () => {
    let emitted: { body: string; source: 'apply' | 'revert'; proposalId: number } | undefined;
    component.bodyChanged.subscribe((value) => (emitted = value));

    service.lastMutation.set({ kind: 'apply', proposalId: 7, body: 'Applied body', nonce: 1 });
    fixture.detectChanges();

    expect(emitted).toEqual({ body: 'Applied body', source: 'apply', proposalId: 7 });
  });

  it('should display conflict errors without crashing', () => {
    service.error.set('This proposal could not be applied because the note changed after the proposal was created.');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('This proposal could not be applied because the note changed after the proposal was created.');
  });
});
