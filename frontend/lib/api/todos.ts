import { apiClient } from './client';

export interface TodoItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  due_date: string | null;
  created_at: string;
  client: { id: string; name: string } | null;
}

export function listTodos(): Promise<TodoItem[]> {
  return apiClient<TodoItem[]>('/todos');
}

export function createTodo(data: {
  title: string;
  description?: string;
  client_id?: string;
  due_date?: string;
}): Promise<TodoItem> {
  return apiClient<TodoItem>('/todos', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateTodo(
  id: string,
  data: { title?: string; description?: string; status?: string; due_date?: string },
): Promise<TodoItem> {
  return apiClient<TodoItem>(`/todos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteTodo(id: string): Promise<void> {
  return apiClient<void>(`/todos/${id}`, { method: 'DELETE' });
}
