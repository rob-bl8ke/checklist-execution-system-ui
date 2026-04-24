import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AiInteractionResponse,
  AiProposalMutationResponse,
  AiProviderStatusResponse,
  AiSessionResponse,
  CreateNoteDto,
  CreateNoteVersionDto,
  Note,
  NoteVersion,
  PaginatedResponse,
  RunAiActionDto,
  SendAiMessageDto,
  UpdateNoteDto,
} from '../models/api.models';

type TagMode = 'any' | 'all';
type GenerateNoteResponse = { rendered: string };

@Injectable({ providedIn: 'root' })
export class NotesApiService {
  private readonly http = inject(HttpClient);
  private readonly notesBase = `${environment.apiUrl}/notes`;
  private readonly aiBase = `${environment.apiUrl}/ai`;
  private readonly noteTargetType = 'NOTE';

  getNotes(
    page: number,
    limit: number,
    search?: string,
    tags?: string[],
    tagMode?: TagMode,
  ): Observable<PaginatedResponse<Note>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    if (search) {
      params = params.set('search', search);
    }

    if (tags && tags.length > 0) {
      for (const tag of tags) {
        params = params.append('tags', tag);
      }
    }

    if (tagMode) {
      params = params.set('tagMode', tagMode);
    }

    return this.http
      .get<{ items: Note[]; total: number }>(this.notesBase, { params })
      .pipe(map((response) => ({ ...response, page, limit })));
  }

  getTags(): Observable<string[]> {
    return this.http.get<string[]>(`${this.notesBase}/tags`);
  }

  getNote(id: number): Observable<Note> {
    return this.http.get<Note>(`${this.notesBase}/${id}`);
  }

  createNote(dto: CreateNoteDto): Observable<Note> {
    return this.http.post<Note>(this.notesBase, dto);
  }

  updateNote(id: number, dto: UpdateNoteDto): Observable<Note> {
    return this.http.put<Note>(`${this.notesBase}/${id}`, dto);
  }

  deleteNote(id: number): Observable<void> {
    return this.http.delete<void>(`${this.notesBase}/${id}`);
  }

  generateNote(id: number, variables: Record<string, string>): Observable<GenerateNoteResponse> {
    return this.http.post<GenerateNoteResponse>(`${this.notesBase}/${id}/generate`, {
      variables,
    });
  }

  getVersions(id: number): Observable<NoteVersion[]> {
    return this.http.get<NoteVersion[]>(`${this.notesBase}/${id}/versions`);
  }

  createVersion(id: number, dto?: CreateNoteVersionDto): Observable<NoteVersion> {
    return this.http.post<NoteVersion>(`${this.notesBase}/${id}/versions`, dto ?? {});
  }

  restoreVersion(id: number, versionId: number): Observable<Note> {
    return this.http.post<Note>(`${this.notesBase}/${id}/versions/${versionId}/restore`, {});
  }

  getAiProviderStatus(): Observable<AiProviderStatusResponse> {
    return this.http.get<AiProviderStatusResponse>(`${this.aiBase}/providers/status`);
  }

  getAiSession(noteId: number): Observable<AiSessionResponse> {
    return this.http.get<AiSessionResponse>(
      `${this.aiBase}/targets/${this.noteTargetType}/${noteId}/session`,
    );
  }

  clearAiSession(noteId: number): Observable<void> {
    return this.http.delete<void>(`${this.aiBase}/targets/${this.noteTargetType}/${noteId}/session`);
  }

  sendAiMessage(noteId: number, dto: SendAiMessageDto): Observable<AiInteractionResponse> {
    return this.http.post<AiInteractionResponse>(
      `${this.aiBase}/targets/${this.noteTargetType}/${noteId}/messages`,
      dto,
    );
  }

  runAiAction(
    noteId: number,
    actionKey: string,
    dto: RunAiActionDto = {},
  ): Observable<AiInteractionResponse> {
    return this.http.post<AiInteractionResponse>(
      `${this.aiBase}/targets/${this.noteTargetType}/${noteId}/actions/${actionKey}`,
      dto,
    );
  }

  applyAiProposal(proposalId: number): Observable<AiProposalMutationResponse> {
    return this.http.post<AiProposalMutationResponse>(
      `${this.aiBase}/proposals/${proposalId}/apply`,
      {},
    );
  }

  revertAiProposal(proposalId: number): Observable<AiProposalMutationResponse> {
    return this.http.post<AiProposalMutationResponse>(
      `${this.aiBase}/proposals/${proposalId}/revert`,
      {},
    );
  }
}
