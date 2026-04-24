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
  });

  it('should show the loading spinner during AI calls', () => {
    service.loading.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('AI assistant working');
  });
});
