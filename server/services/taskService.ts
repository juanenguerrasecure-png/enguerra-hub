import { TaskItem, TaskResponsibility, TaskHistoryEntry, TaskStatus } from '../../src/types';
import { TasksRepository } from '../repositories/tasksRepository';
import { AuditRepository } from '../repositories/auditRepository';

export class TaskService {
  private tasksRepo = new TasksRepository();
  private auditRepo = new AuditRepository();

  public async getTasks(memberRole: string, memberId: string, isHubLocked: boolean = false): Promise<TaskItem[]> {
    return this.tasksRepo.getTasks(memberRole, memberId, isHubLocked);
  }

  public async getResponsibilities(assignedMemberId?: string): Promise<TaskResponsibility[]> {
    return this.tasksRepo.getResponsibilities(assignedMemberId);
  }

  public async getTaskHistory(taskId?: string, memberId?: string): Promise<TaskHistoryEntry[]> {
    return this.tasksRepo.getHistory(taskId, memberId);
  }

  public async createTask(data: {
    title: string;
    description?: string;
    dueDate: string;
    assignedTo: string;
    category?: any;
    priority?: any;
    visibility?: any;
    points?: number;
  }, createdBy: string): Promise<void> {
    const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await this.tasksRepo.createTask({
      Task_ID: taskId,
      Title: data.title,
      Description: data.description || '',
      Due_Date: data.dueDate,
      Assigned_To: data.assignedTo,
      Status: 'PENDING',
      Priority: data.priority || 'MEDIUM',
      Visibility: data.visibility || 'FAMILY',
      Category: data.category || 'CHORE',
      Points: data.points || 10,
      Approved_By: null,
      Created_By: createdBy,
      Deleted_At: null,
    });

    await this.auditRepo.logActivity({
      memberId: createdBy,
      action: 'CREATE_TASK',
      entityType: 'TASK',
      entityId: taskId,
      details: { title: data.title, assignedTo: data.assignedTo },
    });
  }

  public async updateStatus(
    taskId: string,
    status: TaskStatus,
    memberRole: string,
    memberId: string,
    note?: string
  ): Promise<TaskItem> {
    // Child can mark their task COMPLETED, but only PARENT (OWNER/ADMIN) can APPROVE points
    if (status === 'APPROVED' && memberRole === 'CHILD') {
      throw new Error('PERMISSION_DENIED: Only parents can approve completed tasks and award points');
    }

    const updated = await this.tasksRepo.updateTaskStatus(taskId, status, memberId, note);

    await this.auditRepo.logActivity({
      memberId,
      action: `TASK_${status}`,
      entityType: 'TASK',
      entityId: taskId,
      details: { status, points: updated.Points },
    });

    return updated;
  }
}
