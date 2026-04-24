import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AiAssistantService } from './ai-assistant.service';
import { AiCapabilitiesSummary, AiSessionResponse } from '../models/api.models';

const MOCK_CAPABILITIES: AiCapabilitiesSummary = {
  providerKey: 'openai-api',
  available: true,
  transport: 'api',
  supportsChat: true,
  supportsPresetActions: true,
  supportsStructuredProposal: true,
  supportsStreaming: false,
};

const MOCK_SESSION_RESPONSE: AiSessionResponse = {
  session: {
    id: 9,
    targetType: 'NOTE',
    targetId: 3,
    providerKey: 'openai-api',
    model: 'gpt-4.1-mini',
    createdAt: '',
    updatedAt: null,
    clearedAt: null,
  },
  messages: [
    { id: 1, role: 'USER', content: 'Help me tighten this note.', presetActionKey: null, createdAt: '' },
    { id: 2, role: 'ASSISTANT', content: 'Here is a tighter version.', presetActionKey: null, createdAt: '' },
  ],
  proposals: [
    {
      id: 11,
      status: 'PENDING',
      proposalType: 'BODY_REWRITE',
      fieldName: 'body',
      rationale: 'Clearer flow.',
      confidence: 0.92,
      createdAt: '',
      appliedAt: null,
      revertedAt: null,
    },
  ],
  capabilitiesSummary: MOCK_CAPABILITIES,
};

describe('AiAssistantService', () => {
  let service: AiAssistantService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AiAssistantService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('should load a session into signal state', () => {
    service.loadSession('NOTE', 3);
    expect(service.loading()).toBeTrue();

    http.expectOne('http://localhost:3000/api/ai/targets/NOTE/3/session').flush(MOCK_SESSION_RESPONSE);

    expect(service.loading()).toBeFalse();
    expect(service.session()).toEqual(MOCK_SESSION_RESPONSE.session);
    expect(service.messages()).toEqual(MOCK_SESSION_RESPONSE.messages);
    expect(service.proposals()).toEqual(MOCK_SESSION_RESPONSE.proposals);
    expect(service.capabilities()).toEqual(MOCK_CAPABILITIES);
  });

  it('should treat a missing session as an empty state', () => {
    service.loadSession('NOTE', 3);

    http.expectOne('http://localhost:3000/api/ai/targets/NOTE/3/session').flush(
      { message: 'missing' },
      { status: 404, statusText: 'Not Found' },
    );

    expect(service.loading()).toBeFalse();
    expect(service.session()).toBeNull();
    expect(service.messages()).toEqual([]);
    expect(service.proposals()).toEqual([]);
    expect(service.error()).toBeNull();
  });

  it('should send a message then refresh the session state', () => {
    service.sendMessage('NOTE', 3, { message: 'Improve this note' });
    expect(service.loading()).toBeTrue();

    http.expectOne('http://localhost:3000/api/ai/targets/NOTE/3/messages').flush({
      session: MOCK_SESSION_RESPONSE.session,
      assistantMessage: 'Done',
      proposal: {
        id: 11,
        proposalType: 'BODY_REWRITE',
        fieldName: 'body',
        currentValue: 'Before',
        proposedValue: 'After',
        rationale: 'Clearer flow.',
        confidence: 0.92,
        status: 'PENDING',
      },
      finishReason: 'STOP',
      capabilitiesSummary: MOCK_CAPABILITIES,
    });

    expect(service.loading()).toBeTrue();

    http.expectOne('http://localhost:3000/api/ai/targets/NOTE/3/session').flush(MOCK_SESSION_RESPONSE);

    expect(service.loading()).toBeFalse();
    expect(service.messages()).toEqual(MOCK_SESSION_RESPONSE.messages);
    expect(service.proposals()).toEqual(MOCK_SESSION_RESPONSE.proposals);
  });

  it('should update provider status signals', () => {
    service.loadProviderStatus();

    http.expectOne('http://localhost:3000/api/ai/providers/status').flush({
      providers: [
        {
          providerKey: 'openai-api',
          available: true,
          transport: 'api',
          supportsChat: true,
          supportsPresetActions: true,
          supportsStructuredProposal: true,
          supportsStreaming: false,
          supportedModels: ['gpt-4.1-mini'],
        },
      ],
      defaultProviderKey: 'openai-api',
    });

    expect(service.providers().length).toBe(1);
    expect(service.defaultProviderKey()).toBe('openai-api');
  });
});
