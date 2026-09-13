import { TaskItem, TaskResponsibility, TaskHistoryEntry, TaskStatus, EntityVisibility } from '../../src/types';
import { SheetStore } from '../storage/sheetStore';

export class TasksRepository {
  private store = SheetStore.getInstance();

  public async getTasks(memberRole: string, memberId: string, isHubLocked: boolean = false): Promise<TaskItem[]> {
    const raw = await this.store.getTableRecords<any>('Tasks');
    const tasks: TaskItem[] = raw.map(r => ({
      Task_ID: r.Task_ID,
      Title: r.Title,
      Description: r.Description || '',
      Due_Date: r.Due_Date,
      Assigned_To: r.Assigned_To,
      Status: r.Status as TaskStatus,
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

    return tasks.filter(t => {
      if (t.Deleted_At) return false;
      if (isHubLocked) {
        return t.Visibility === 'FAMILY' || t.Visibility === 'HUB';
      }
      if (memberRole === 'OWNER' || memberRole === 'ADMIN') return true;
      if (memberRole === 'CHILD') {
        if (t.Visibility === 'PARENTS_ONLY') return false;
        if (t.Visibility === 'PRIVATE' && t.Assigned_To !== memberId && t.Created_By !== memberId) return false;
        return true;
      }
      return t.Visibility === 'FAMILY';
    });
  }

  public async getResponsibilities(assignedMemberId?: string): Promise<TaskResponsibility[]> {
    const raw = await this.store.getTableRecords<any>('Task_Responsibilities');
    const all = raw.map(r => {
      let days: string[] = [];
      try {
        days = typeof r.Target_Days === 'string' && r.Target_Days.startsWith('[')
          ? JSON.parse(r.Target_Days)
          : (r.Target_Days ? [r.Target_Days] : []);
      } catch {
        days = [];
      }

      return {
        Responsibility_ID: r.Responsibility_ID,
        Title: r.Title,
        Category: r.Category,
        Recurrence: r.Recurrence,
        Assigned_To: r.Assigned_To,
        Target_Days: days,
        Points: Number(r.Points) || 0,
        Active: String(r.Active) !== 'false',
        Created_At: r.Created_At,
        Updated_At: r.Updated_At,
        Version: Number(r.Version) || 1,
        Deleted_At: r.Deleted_At || null,
      };
    });

    if (assignedMemberId) {
      return all.filter(r => !r.Deleted_At && r.Assigned_To === assignedMemberId);
    }
    return all.filter(r => !r.Deleted_At);
  }

  public async getHistory(taskId?: string, memberId?: string): Promise<TaskHistoryEntry[]> {
    const raw = await this.store.getTableRecords<any>('Task_History');
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

  public async createTask(task: Omit<TaskItem, 'Version' | 'Created_At' | 'Updated_At'>): Promise<void> {
    await this.store.upsertRecord('Tasks', 'Task_ID', task);
  }

  public async updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    updatedByMemberId: string,
    note?: string
  ): Promise<TaskItem> {
    const raw = await this.store.getRecordById<any>('Tasks', 'Task_ID', taskId);
    if (!raw) throw new Error('Task not found');

    const points = status === 'APPROVED' ? Number(raw.Points) || 0 : 0;
    const approvedBy = status === 'APPROVED' ? updatedByMemberId : (status === 'REOPENED' ? null : raw.Approved_By);

    await this.store.upsertRecord('Tasks', 'Task_ID', {
      ...raw,
      Status: status,
      Approved_By: approvedBy,
      Version: raw.Version,
    });

    // Record in Task_History
    const historyEntry: TaskHistoryEntry = {
      History_ID: `th-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      Task_ID: taskId,
      Member_ID: updatedByMemberId,
      Action: status as any,
      Points_Awarded: points,
      Timestamp: new Date().toISOString(),
      Note: note || '',
    };
    await this.store.upsertRecord('Task_History', 'History_ID', historyEntry);

    const updated = await this.store.getRecordById<any>('Tasks', 'Task_ID', taskId);
    return updated;
  }
}
