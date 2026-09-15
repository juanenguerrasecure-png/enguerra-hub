/**
 * Enguerra of NY - Google Sheets Tasks Repository
 *
 * Direct repository layer interfacing with the "Tasks" Google Sheets tab
 * as defined in .env (SHEET_TAB_TASKS or default "Tasks").
 *
 * Implements:
 * - Direct Google Sheets v4 REST API reading and writing
 * - Dynamic column header mapping (resilient to spreadsheet column changes)
 * - Role-based visibility enforcement (Parent vs. Child vs. Hub Lock)
 * - Two-way synchronization with local authoritative SheetStore (instant cache & offline resilience)
 * - Points awarding with parental authorization check
 * - Task status lifecycle & audit history logging
 */

import {
  TaskItem,
  TaskResponsibility,
  TaskHistoryEntry,
  TaskStatus,
  EntityVisibility
} from '../../src/types';
import { GoogleSheetsClient } from '../google/sheets';
import { SheetStore } from '../storage/sheetStore';
import { GoogleSheetsService } from '../services/googleSheetsService';
import { AuditRepository } from './auditRepository';

export interface TasksQueryFilter {
  memberRole?: string;
  memberId?: string;
  assignedTo?: string;
  status?: string;
  priority?: string;
  category?: string;
  isHubLocked?: boolean;
  includeDeleted?: boolean;
}

export class GoogleSheetsTasksRepository {
  private static instance: GoogleSheetsTasksRepository;
  private sheetsService = GoogleSheetsService.getInstance();
  private localStore = SheetStore.getInstance();
  private auditRepo = new AuditRepository();
  private client: GoogleSheetsClient;
  private tabName: string;

  constructor() {
    const config = this.sheetsService.getConfig();
    this.client = new GoogleSheetsClient(config.spreadsheetId);
    this.tabName = config.tasksTab || 'Tasks';
  }

  public static getInstance(): GoogleSheetsTasksRepository {
    if (!GoogleSheetsTasksRepository.instance) {
      GoogleSheetsTasksRepository.instance = new GoogleSheetsTasksRepository();
    }
    return GoogleSheetsTasksRepository.instance;
  }

  public getTabName(): string {
    return this.tabName;
  }

  public getSpreadsheetId(): string {
    return this.sheetsService.getConfig().spreadsheetId;
  }

  /**
   * Fetches tasks from the Tasks Google Sheets tab with role-based visibility and filters
   */
  public async getTasks(filter: TasksQueryFilter = {}): Promise<TaskItem[]> {
    const config = this.sheetsService.getConfig();
    let tasks: TaskItem[] = [];

    if (config.isConfigured) {
      try {
        const rows = await this.client.getValues(`${this.tabName}!A1:Z`);
        if (rows && rows.length > 1) {
          const headers = rows[0].map(h => (h || '').trim());
          const headerMap = new Map<string, number>();
          headers.forEach((h, idx) => headerMap.set(h.toLowerCase(), idx));

          for (let i = 1; i < rows.length; i++) {
            const task = this.rowToTask(rows[i], headerMap);
            if (!task) continue;
            tasks.push(task);
          }

          // Keep local store in sync with live sheet data
          for (const t of tasks) {
            try {
              await this.localStore.upsertRecord('Tasks', 'Task_ID', t);
            } catch {
              // Ignore local cache update glitches
            }
          }
        }
      } catch (err: any) {
        console.warn(`[GoogleSheetsTasksRepository] Live read failed from ${this.tabName}:`, err.message);
      }
    }

    // Fallback to local store if live had no results or was offline
    if (tasks.length === 0) {
      const raw = await this.localStore.getTableRecords<any>('Tasks');
      tasks = raw.map(r => ({
        Task_ID: r.Task_ID,
        Title: r.Title,
        Description: r.Description || '',
        Due_Date: r.Due_Date,
        Assigned_To: r.Assigned_To,
        Status: (r.Status || 'PENDING') as TaskStatus,
        Priority: r.Priority || 'MEDIUM',
        Visibility: (r.Visibility || 'FAMILY') as EntityVisibility,
        Category: r.Category || 'CHORE',
        Points: Number(r.Points) || 0,
        Approved_By: r.Approved_By || null,
        Created_By: r.Created_By,
        Created_At: r.Created_At,
        Updated_At: r.Updated_At,
        Version: Number(r.Version) || 1,
        Deleted_At: r.Deleted_At || null,
      }));
    }

    // Apply filtering and access control
    return tasks.filter(t => {
      if (!filter.includeDeleted && t.Deleted_At) return false;

      // Hub lock filter
      if (filter.isHubLocked) {
        if (t.Visibility !== 'FAMILY' && t.Visibility !== 'HUB') return false;
      }

      // Role-based visibility
      const role = filter.memberRole;
      const memberId = filter.memberId;

      if (role === 'CHILD') {
        if (t.Visibility === 'PARENTS_ONLY') return false;
        // Server-side enforcement: Child can only see their own assigned work
        if (t.Assigned_To !== memberId) {
          return false;
        }
      }

      // Specific query filters
      if (filter.assignedTo && t.Assigned_To !== filter.assignedTo) return false;
      if (filter.status && t.Status !== filter.status) return false;
      if (filter.priority && t.Priority !== filter.priority) return false;
      if (filter.category && t.Category !== filter.category) return false;

      return true;
    });
  }

  /**
   * Fetches a single task by Task_ID
   */
  public async getById(taskId: string): Promise<TaskItem | null> {
    const all = await this.getTasks({ includeDeleted: true });
    return all.find(t => t.Task_ID === taskId && !t.Deleted_At) || null;
  }

  /**
   * Creates a new task in the Tasks Google Sheets tab
   */
  public async createTask(
    data: {
      title: string;
      description?: string;
      dueDate?: string;
      assignedTo: string;
      category?: string;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH';
      visibility?: EntityVisibility;
      points?: number;
    },
    createdBy: string
  ): Promise<TaskItem> {
    const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const now = new Date().toISOString();
    const dueDate = data.dueDate || now.split('T')[0];

    const newTask: TaskItem = {
      Task_ID: taskId,
      Title: data.title.trim(),
      Description: (data.description || '').trim(),
      Due_Date: dueDate,
      Assigned_To: data.assignedTo,
      Status: 'PENDING',
      Priority: data.priority || 'MEDIUM',
      Visibility: data.visibility || 'FAMILY',
      Category: (data.category || 'CHORE') as any,
      Points: Number(data.points) || 10,
      Approved_By: null,
      Created_By: createdBy,
      Created_At: now,
      Updated_At: now,
      Version: 1,
      Deleted_At: null,
    };

    // Save to local store
    await this.localStore.upsertRecord('Tasks', 'Task_ID', newTask);

    // Append to live Google Sheets tab
    if (this.sheetsService.getConfig().isConfigured) {
      try {
        const row = [
          newTask.Task_ID,
          newTask.Title,
          newTask.Description,
          newTask.Due_Date,
          newTask.Assigned_To,
          newTask.Status,
          newTask.Priority,
          newTask.Visibility,
          newTask.Category,
          String(newTask.Points),
          newTask.Approved_By || '',
          newTask.Created_By,
          newTask.Created_At,
          newTask.Updated_At,
          String(newTask.Version),
          '', // Deleted_At
        ];
        await this.client.appendValues(this.tabName, [row]);
        console.log(`[GoogleSheetsTasksRepository] Appended task ${taskId} to live Google Sheet tab "${this.tabName}"`);
      } catch (err: any) {
        console.warn(`[GoogleSheetsTasksRepository] Live Google Sheet append failed:`, err.message);
      }
    }

    // Log activity
    await this.auditRepo.logActivity({
      memberId: createdBy,
      action: 'CREATE_TASK',
      entityType: 'TASK',
      entityId: taskId,
      details: { title: newTask.Title, assignedTo: newTask.Assigned_To, points: newTask.Points },
    });

    return newTask;
  }

  /**
   * Updates task details in the Tasks Google Sheets tab
   */
  public async updateTask(
    taskId: string,
    updates: Partial<TaskItem>,
    updaterId?: string
  ): Promise<TaskItem> {
    const existing = await this.getById(taskId);
    if (!existing) {
      throw new Error(`Task with ID "${taskId}" not found in ${this.tabName}`);
    }

    const now = new Date().toISOString();
    const newVersion = (existing.Version || 1) + 1;

    const updated: TaskItem = {
      ...existing,
      Title: updates.Title !== undefined ? updates.Title.trim() : existing.Title,
      Description: updates.Description !== undefined ? updates.Description.trim() : existing.Description,
      Due_Date: updates.Due_Date !== undefined ? updates.Due_Date : existing.Due_Date,
      Assigned_To: updates.Assigned_To !== undefined ? updates.Assigned_To : existing.Assigned_To,
      Status: updates.Status !== undefined ? updates.Status : existing.Status,
      Priority: updates.Priority !== undefined ? updates.Priority : existing.Priority,
      Visibility: updates.Visibility !== undefined ? updates.Visibility : existing.Visibility,
      Category: updates.Category !== undefined ? updates.Category : existing.Category,
      Points: updates.Points !== undefined ? Number(updates.Points) : existing.Points,
      Approved_By: updates.Approved_By !== undefined ? updates.Approved_By : existing.Approved_By,
      Updated_At: now,
      Version: newVersion,
    };

    // Save to local store
    await this.localStore.upsertRecord('Tasks', 'Task_ID', updated);

    // Update in live Google Sheets tab
    if (this.sheetsService.getConfig().isConfigured) {
      try {
        const rows = await this.client.getValues(`${this.tabName}!A1:Z`);
        if (rows && rows.length > 1) {
          const headers = rows[0].map(h => (h || '').trim());
          const headerMap = new Map<string, number>();
          headers.forEach((h, idx) => headerMap.set(h.toLowerCase(), idx));
          const idCol = headerMap.get('task_id') ?? 0;

          const rowIndex = rows.findIndex((r, idx) => idx > 0 && r[idCol] === taskId);
          if (rowIndex > 0) {
            const sheetRowNumber = rowIndex + 1;
            const currentRow = [...rows[rowIndex]];

            const setVal = (key: string, val: string) => {
              const col = headerMap.get(key.toLowerCase());
              if (col !== undefined) {
                while (currentRow.length <= col) currentRow.push('');
                currentRow[col] = val;
              }
            };

            setVal('Title', updated.Title);
            setVal('Description', updated.Description);
            setVal('Due_Date', updated.Due_Date);
            setVal('Assigned_To', updated.Assigned_To);
            setVal('Status', updated.Status);
            setVal('Priority', updated.Priority);
            setVal('Visibility', updated.Visibility);
            setVal('Category', updated.Category);
            setVal('Points', String(updated.Points));
            setVal('Approved_By', updated.Approved_By || '');
            setVal('Updated_At', updated.Updated_At);
            setVal('Version', String(updated.Version));

            await this.client.updateValues(`${this.tabName}!A${sheetRowNumber}:Z${sheetRowNumber}`, [currentRow]);
            console.log(`[GoogleSheetsTasksRepository] Updated task ${taskId} in live Google Sheet row ${sheetRowNumber}`);
          }
        }
      } catch (err: any) {
        console.warn(`[GoogleSheetsTasksRepository] Live Google Sheet update failed:`, err.message);
      }
    }

    return updated;
  }

  /**
   * Updates task status with role validation and audit history recording
   * Preserves real workflow:
   * OPEN -> IN_PROGRESS -> PENDING_APPROVAL -> VERIFIED -> REOPENED -> CANCELLED
   */
  public async updateStatus(
    taskId: string,
    status: TaskStatus,
    memberRole: string,
    memberId: string,
    note?: string
  ): Promise<TaskItem> {
    const task = await this.getById(taskId);
    if (!task) {
      throw new Error(`Task with ID "${taskId}" not found`);
    }

    // Normalize legacy status aliases
    let targetStatus: TaskStatus = status;
    if ((status as any) === 'PENDING') targetStatus = 'OPEN';
    else if ((status as any) === 'COMPLETED') targetStatus = 'PENDING_APPROVAL';
    else if ((status as any) === 'APPROVED') targetStatus = 'VERIFIED';

    // CHILD role validation
    if (memberRole === 'CHILD') {
      // Child can only update their own assigned work
      if (task.Assigned_To !== memberId) {
        throw new Error('PERMISSION_DENIED: Children can only update their own assigned tasks');
      }

      // Child can only mark in progress or finished (pending approval)
      if (targetStatus !== 'IN_PROGRESS' && targetStatus !== 'PENDING_APPROVAL') {
        throw new Error('PERMISSION_DENIED: Children can only mark tasks In Progress or Finished (Pending Parent Review)');
      }
    }

    // Parental approval & reopening validation
    if (
      (targetStatus === 'VERIFIED' || targetStatus === 'REOPENED' || targetStatus === 'CANCELLED') &&
      memberRole === 'CHILD'
    ) {
      throw new Error('PERMISSION_DENIED: Only parents can review, approve/verify, reopen, or cancel tasks');
    }

    const isVerified = targetStatus === 'VERIFIED';
    const isReopened = targetStatus === 'REOPENED';
    const points = isVerified ? (Number(task.Points) || 0) : 0;
    const approvedBy = isVerified ? memberId : (isReopened ? null : task.Approved_By);

    const updatedTask = await this.updateTask(taskId, {
      Status: targetStatus,
      Approved_By: approvedBy,
    }, memberId);

    // Record history
    const historyEntry: TaskHistoryEntry = {
      History_ID: `th-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      Task_ID: taskId,
      Member_ID: memberId,
      Action: targetStatus as any,
      Points_Awarded: points,
      Timestamp: new Date().toISOString(),
      Note: note || '',
    };
    await this.localStore.upsertRecord('Task_History', 'History_ID', historyEntry);

    // Audit log
    await this.auditRepo.logActivity({
      memberId,
      action: 'UPDATE_TASK_STATUS',
      entityType: 'TASK',
      entityId: taskId,
      details: { status: targetStatus, pointsAwarded: points, note: note || '' },
    });

    return updatedTask;
  }

  /**
   * Soft deletes a task in the Tasks Google Sheets tab
   */
  public async deleteTask(taskId: string, memberId: string): Promise<void> {
    const task = await this.getById(taskId);
    if (!task) return;

    const now = new Date().toISOString();
    await this.localStore.upsertRecord('Tasks', 'Task_ID', {
      ...task,
      Deleted_At: now,
      Updated_At: now,
      Version: (task.Version || 1) + 1,
    });

    if (this.sheetsService.getConfig().isConfigured) {
      try {
        const rows = await this.client.getValues(`${this.tabName}!A1:Z`);
        if (rows && rows.length > 1) {
          const headers = rows[0].map(h => (h || '').trim());
          const headerMap = new Map<string, number>();
          headers.forEach((h, idx) => headerMap.set(h.toLowerCase(), idx));
          const idCol = headerMap.get('task_id') ?? 0;

          const rowIndex = rows.findIndex((r, idx) => idx > 0 && r[idCol] === taskId);
          if (rowIndex > 0) {
            const sheetRowNumber = rowIndex + 1;
            const currentRow = [...rows[rowIndex]];
            const delCol = headerMap.get('deleted_at');
            if (delCol !== undefined) {
              while (currentRow.length <= delCol) currentRow.push('');
              currentRow[delCol] = now;
              await this.client.updateValues(`${this.tabName}!A${sheetRowNumber}:Z${sheetRowNumber}`, [currentRow]);
            }
          }
        }
      } catch (err: any) {
        console.warn(`[GoogleSheetsTasksRepository] Live Google Sheet delete failed:`, err.message);
      }
    }

    await this.auditRepo.logActivity({
      memberId,
      action: 'DELETE_TASK',
      entityType: 'TASK',
      entityId: taskId,
      details: { title: task.Title },
    });
  }

  /**
   * Retrieves recurring responsibilities
   */
  public async getResponsibilities(assignedMemberId?: string): Promise<TaskResponsibility[]> {
    return this.sheetsService.fetchTaskResponsibilities({ memberId: assignedMemberId });
  }

  /**
   * Creates a new recurring responsibility (Parent only)
   */
  public async createResponsibility(
    data: {
      title: string;
      category?: string;
      recurrence?: 'DAILY' | 'WEEKLY' | 'SCHOOL_DAYS' | 'WEEKENDS';
      assignedTo: string;
      targetDays?: string[];
      points?: number;
    },
    createdBy: string
  ): Promise<TaskResponsibility> {
    const id = `resp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    const newResp: TaskResponsibility = {
      Responsibility_ID: id,
      Title: data.title.trim(),
      Category: data.category || 'CHORE',
      Recurrence: data.recurrence || 'DAILY',
      Assigned_To: data.assignedTo,
      Target_Days: data.targetDays || ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
      Points: Number(data.points) || 10,
      Active: true,
      Created_At: now,
      Updated_At: now,
      Version: 1,
      Deleted_At: null,
    };

    await this.localStore.upsertRecord('Task_Responsibilities', 'Responsibility_ID', newResp);

    await this.auditRepo.logActivity({
      memberId: createdBy,
      action: 'CREATE_RESPONSIBILITY',
      entityType: 'TASK',
      entityId: id,
      details: { title: newResp.Title, assignedTo: newResp.Assigned_To },
    });

    return newResp;
  }

  /**
   * Updates an existing recurring responsibility (Parent only)
   */
  public async updateResponsibility(
    id: string,
    updates: Partial<TaskResponsibility>,
    updaterId: string
  ): Promise<TaskResponsibility> {
    const all = await this.getResponsibilities();
    const existing = all.find(r => r.Responsibility_ID === id);
    if (!existing) {
      throw new Error(`Responsibility with ID "${id}" not found`);
    }

    const now = new Date().toISOString();
    const updated: TaskResponsibility = {
      ...existing,
      ...updates,
      Updated_At: now,
      Version: (existing.Version || 1) + 1,
    };

    await this.localStore.upsertRecord('Task_Responsibilities', 'Responsibility_ID', updated);

    await this.auditRepo.logActivity({
      memberId: updaterId,
      action: 'UPDATE_RESPONSIBILITY',
      entityType: 'TASK',
      entityId: id,
      details: updates,
    });

    return updated;
  }

  /**
   * Deletes a recurring responsibility (Parent only)
   */
  public async deleteResponsibility(id: string, memberId: string): Promise<void> {
    const all = await this.getResponsibilities();
    const existing = all.find(r => r.Responsibility_ID === id);
    if (!existing) return;

    const now = new Date().toISOString();
    await this.localStore.upsertRecord('Task_Responsibilities', 'Responsibility_ID', {
      ...existing,
      Active: false,
      Deleted_At: now,
      Updated_At: now,
      Version: (existing.Version || 1) + 1,
    });

    await this.auditRepo.logActivity({
      memberId,
      action: 'DELETE_RESPONSIBILITY',
      entityType: 'TASK',
      entityId: id,
      details: { title: existing.Title },
    });
  }

  /**
   * Completes a recurring responsibility occurrence for a specific date.
   * CRITICAL REQUIREMENT: "Recurring responsibility completion must not complete future occurrences."
   * Creates or updates a discrete task item for `dateStr` without modifying future occurrences.
   */
  public async completeResponsibilityOccurrence(
    responsibilityId: string,
    dateStr: string,
    memberRole: string,
    memberId: string,
    note?: string
  ): Promise<TaskItem> {
    const allResp = await this.getResponsibilities();
    const resp = allResp.find(r => r.Responsibility_ID === responsibilityId);
    if (!resp) {
      throw new Error(`Responsibility "${responsibilityId}" not found`);
    }

    if (memberRole === 'CHILD' && resp.Assigned_To !== memberId) {
      throw new Error('PERMISSION_DENIED: You can only complete your own assigned responsibilities');
    }

    // Concrete task instance for this date
    const instanceTaskId = `inst-${responsibilityId}-${dateStr}`;
    const targetStatus: TaskStatus = memberRole === 'CHILD' ? 'PENDING_APPROVAL' : 'VERIFIED';
    const approvedBy = targetStatus === 'VERIFIED' ? memberId : null;

    const existingTask = await this.getById(instanceTaskId);
    let resultTask: TaskItem;

    if (existingTask) {
      resultTask = await this.updateTask(instanceTaskId, {
        Status: targetStatus,
        Approved_By: approvedBy,
      }, memberId);
    } else {
      const now = new Date().toISOString();
      const newTask: TaskItem = {
        Task_ID: instanceTaskId,
        Title: resp.Title,
        Description: `Daily responsibility for ${dateStr}`,
        Due_Date: dateStr,
        Assigned_To: resp.Assigned_To,
        Status: targetStatus,
        Priority: 'MEDIUM',
        Visibility: 'FAMILY',
        Category: (resp.Category as any) || 'ROUTINE',
        Points: resp.Points || 10,
        Approved_By: approvedBy,
        Responsibility_ID: resp.Responsibility_ID,
        Created_By: memberId,
        Created_At: now,
        Updated_At: now,
        Version: 1,
        Deleted_At: null,
      };

      await this.localStore.upsertRecord('Tasks', 'Task_ID', newTask);
      resultTask = newTask;
    }

    // Record audit history
    await this.auditRepo.logActivity({
      memberId,
      action: 'COMPLETE_RESPONSIBILITY_OCCURRENCE',
      entityType: 'TASK',
      entityId: instanceTaskId,
      details: { responsibilityId, dateStr, status: targetStatus, note: note || '' },
    });

    return resultTask;
  }

  /**
   * Retrieves task history entries
   */
  public async getHistory(taskId?: string, memberId?: string): Promise<TaskHistoryEntry[]> {
    const raw = await this.localStore.getTableRecords<any>('Task_History');
    let history = raw.map(r => ({
      History_ID: r.History_ID,
      Task_ID: r.Task_ID,
      Member_ID: r.Member_ID,
      Action: r.Action,
      Points_Awarded: Number(r.Points_Awarded) || 0,
      Timestamp: r.Timestamp,
      Note: r.Note || '',
    }));

    if (taskId) history = history.filter(h => h.Task_ID === taskId);
    if (memberId) history = history.filter(h => h.Member_ID === memberId);
    return history.sort((a, b) => new Date(b.Timestamp).getTime() - new Date(a.Timestamp).getTime());
  }

  private rowToTask(row: string[], headerMap: Map<string, number>): TaskItem | null {
    const getVal = (k: string) => {
      const idx = headerMap.get(k.toLowerCase());
      if (idx === undefined || idx >= row.length) return '';
      return (row[idx] ?? '').toString().trim();
    };

    const id = getVal('Task_ID');
    if (!id) return null;

    return {
      Task_ID: id,
      Title: getVal('Title') || 'Untitled Task',
      Description: getVal('Description'),
      Due_Date: getVal('Due_Date') || new Date().toISOString().split('T')[0],
      Assigned_To: getVal('Assigned_To'),
      Status: (getVal('Status') || 'PENDING') as TaskStatus,
      Priority: (getVal('Priority') || 'MEDIUM') as 'LOW' | 'MEDIUM' | 'HIGH',
      Visibility: (getVal('Visibility') || 'FAMILY') as EntityVisibility,
      Category: (getVal('Category') || 'CHORE') as any,
      Points: parseInt(getVal('Points'), 10) || 0,
      Approved_By: getVal('Approved_By') || null,
      Responsibility_ID: getVal('Responsibility_ID') || null,
      Recurrence: (getVal('Recurrence') as any) || null,
      Recurrence_Until: getVal('Recurrence_Until') || null,
      Created_By: getVal('Created_By') || 'system',
      Created_At: getVal('Created_At') || new Date().toISOString(),
      Updated_At: getVal('Updated_At') || new Date().toISOString(),
      Version: parseInt(getVal('Version'), 10) || 1,
      Deleted_At: getVal('Deleted_At') || null,
    };
  }
}
