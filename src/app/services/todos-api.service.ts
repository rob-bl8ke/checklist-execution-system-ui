import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Todo, CreateTodoDto, UpdateTodoDto } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class TodosApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/todos`;

  getTodos(): Observable<Todo[]> {
    return this.http.get<Todo[]>(this.base);
  }

  createTodo(dto: CreateTodoDto): Observable<Todo> {
    return this.http.post<Todo>(this.base, dto);
  }

  updateTodo(id: number, dto: UpdateTodoDto): Observable<Todo> {
    return this.http.patch<Todo>(`${this.base}/${id}`, dto);
  }

  deleteTodo(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
