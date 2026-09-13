/**
 * Enguerra of NY - Frontend API Client
 *
 * Handles HTTP requests, session header injection, error handling,
 * and media URL resolution.
 */

import {
  BootstrapResponse,
  AuthUserSession,
  CalendarEvent,
  TaskItem,
  TaskResponsibility,
  TaskHistoryEntry,
  FamilyList,
  FamilyListItem,
  ChatThread,
  ChatMessage,
  MediaFile,
  PhotoAlbum,
  DiagnosticsReport,
  FamilyMember
} from '../types';

function getBaseApiUrl(): string {
  if (typeof window === 'undefined') return '';
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, '');
  }
  const customApi = localStorage.getItem('enguerra_api_url');
  if (customApi) {
    return customApi.replace(/\/$/, '');
  }
  if (window.location.hostname.endsWith('github.io')) {
    return 'https://ais-dev-hltnaeuarclyh3jmadmon6-34952012245.us-west1.run.app';
  }
  return '';
}

class ApiClient {
  private sessionId: string | null = null;

  constructor() {
    this.sessionId = localStorage.getItem('enguerra_session_id');
  }

  public setSessionId(id: string | null) {
    this.sessionId = id;
    if (id) {
      localStorage.setItem('enguerra_session_id', id);
    } else {
      localStorage.removeItem('enguerra_session_id');
    }
  }

  public getSessionId(): string | null {
    return this.sessionId;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.sessionId) {
      headers['x-session-id'] = this.sessionId;
    }

    const base = getBaseApiUrl();
    const fullUrl = base && path.startsWith('/') ? `${base}${path}` : path;

    const res = await fetch(fullUrl, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    return res.json();
  }

  // Bootstrap & Health
  public async getBootstrap(): Promise<BootstrapResponse> {
    return this.request<BootstrapResponse>('/api/bootstrap');
  }

  public async getHealth(): Promise<any> {
    return this.request<any>('/api/health');
  }

  // Auth
  public async login(memberId: string, pin: string, deviceType: string): Promise<{ session: AuthUserSession; token: string }> {
    const res = await this.request<{ session: AuthUserSession; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ memberId, pin, deviceType }),
    });
    this.setSessionId(res.session.sessionId);
    return res;
  }

  public async logout(): Promise<void> {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } finally {
      this.setSessionId(null);
    }
  }

  public async getMembers(includeInactive: boolean = false): Promise<FamilyMember[]> {
    return this.request<FamilyMember[]>(`/api/members${includeInactive ? '?includeInactive=true' : ''}`);
  }

  // Events
  public async getEvents(): Promise<CalendarEvent[]> {
    return this.request<CalendarEvent[]>('/api/events');
  }

  public async createEvent(event: Partial<CalendarEvent>): Promise<CalendarEvent> {
    return this.request<CalendarEvent>('/api/events', {
      method: 'POST',
      body: JSON.stringify(event),
    });
  }

  public async updateEvent(id: string, event: Partial<CalendarEvent>): Promise<void> {
    await this.request(`/api/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(event),
    });
  }

  public async deleteEvent(id: string): Promise<void> {
    await this.request(`/api/events/${id}`, { method: 'DELETE' });
  }

  // Tasks
  public async getTasks(): Promise<TaskItem[]> {
    return this.request<TaskItem[]>('/api/tasks');
  }

  public async createTask(task: Partial<TaskItem>): Promise<void> {
    await this.request('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  }

  public async updateTaskStatus(id: string, status: string, note?: string): Promise<TaskItem> {
    return this.request<TaskItem>(`/api/tasks/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note }),
    });
  }

  public async getResponsibilities(assignedTo?: string): Promise<TaskResponsibility[]> {
    const query = assignedTo ? `?assigned_to=${assignedTo}` : '';
    return this.request<TaskResponsibility[]>(`/api/tasks/responsibilities${query}`);
  }

  public async getTaskHistory(taskId?: string, memberId?: string): Promise<TaskHistoryEntry[]> {
    const params = new URLSearchParams();
    if (taskId) params.append('task_id', taskId);
    if (memberId) params.append('member_id', memberId);
    return this.request<TaskHistoryEntry[]>(`/api/tasks/history?${params.toString()}`);
  }

  // Lists
  public async getLists(): Promise<FamilyList[]> {
    return this.request<FamilyList[]>('/api/lists');
  }

  public async createList(list: Partial<FamilyList>): Promise<void> {
    await this.request('/api/lists', {
      method: 'POST',
      body: JSON.stringify(list),
    });
  }

  public async getListItems(listId: string): Promise<FamilyListItem[]> {
    return this.request<FamilyListItem[]>(`/api/lists/${listId}/items`);
  }

  public async addListItem(listId: string, title: string, quantity?: string): Promise<void> {
    await this.request(`/api/lists/${listId}/items`, {
      method: 'POST',
      body: JSON.stringify({ title, quantity }),
    });
  }

  public async toggleListItem(itemId: string, completed: boolean): Promise<void> {
    await this.request(`/api/lists/items/${itemId}/toggle`, {
      method: 'PATCH',
      body: JSON.stringify({ completed }),
    });
  }

  public async deleteListItem(itemId: string): Promise<void> {
    await this.request(`/api/lists/items/${itemId}`, { method: 'DELETE' });
  }

  // Chat & Messages
  public async getThreads(): Promise<ChatThread[]> {
    return this.request<ChatThread[]>('/api/messages/threads');
  }

  public async getMessages(threadId: string): Promise<ChatMessage[]> {
    return this.request<ChatMessage[]>(`/api/messages/threads/${threadId}`);
  }

  public async sendMessage(threadId: string, content: string, attachment?: { driveId: string; mime: string; name: string }): Promise<ChatMessage> {
    return this.request<ChatMessage>(`/api/messages/threads/${threadId}`, {
      method: 'POST',
      body: JSON.stringify({
        content,
        attachmentDriveId: attachment?.driveId,
        attachmentMime: attachment?.mime,
        attachmentName: attachment?.name,
      }),
    });
  }

  // Media
  public async getMedia(): Promise<MediaFile[]> {
    return this.request<MediaFile[]>('/api/media');
  }

  public async getAlbums(): Promise<PhotoAlbum[]> {
    return this.request<PhotoAlbum[]>('/api/media/albums');
  }

  public getMediaStreamUrl(mediaId: string): string {
    const sessionId = this.getSessionId();
    return `/api/media/${mediaId}${sessionId ? `?session_id=${sessionId}` : ''}`;
  }

  public async uploadMedia(payload: {
    fileName: string;
    mimeType: string;
    base64Data: string;
    caption?: string;
    visibility?: string;
  }): Promise<MediaFile> {
    return this.request<MediaFile>('/api/media/upload', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Hub
  public async getHubData(): Promise<any> {
    return this.request('/api/hub/data');
  }

  public async updateMemberProfile(
    memberId: string,
    updates: Partial<FamilyMember> & { pin?: string }
  ): Promise<{ success: boolean; member: FamilyMember; message: string }> {
    return this.request<{ success: boolean; member: FamilyMember; message: string }>(`/api/members/${memberId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Diagnostics & Migration
  public async getDiagnostics(): Promise<DiagnosticsReport> {
    return this.request<DiagnosticsReport>('/api/diagnostics');
  }

  public async getAuthParityReport(): Promise<any> {
    return this.request('/api/auth/parity-report');
  }

  public async testLegacyPin(memberId: string, pin: string): Promise<any> {
    return this.request('/api/auth/verify-legacy-test', {
      method: 'POST',
      body: JSON.stringify({ memberId, pin }),
    });
  }

  public async runMediaMigration(): Promise<any> {
    return this.request('/api/migration/run-media', { method: 'POST' });
  }

  public async getDataVersions(): Promise<Record<string, number>> {
    return this.request<Record<string, number>>('/api/data-versions');
  }
}

export const api = new ApiClient();
