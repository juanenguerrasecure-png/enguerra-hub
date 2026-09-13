import { TaskItem, TaskResponsibility, TaskHistoryEntry, TaskStatus } from '../../src/types';
import { GoogleSheetsTasksRepository } from '../repositories/googleSheetsTasksRepository';
import { AuditRepository } from '../repositories/auditRepository';

export class TaskService {
  private tasksRepo = GoogleSheetsTasksRepository.getInstance();
  private auditRepo = new AuditRepository();

  public async getTasks(memberRole: string, memberId: string, isHubLocked: boolean = false): Promise<TaskItem[]> {
    return this.tasksRepo.getTasks({ memberRole, memberId, isHubLocked });
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
  }, createdBy: string): Promise<TaskItem> {
    return this.tasksRepo.createTask({
      title: data.title,
      description: data.description,
      dueDate: data.dueDate,
      assignedTo: data.assignedTo,
      category: data.category,
      priority: data.priority,
      visibility: data.visibility,
      points: data.points,
    }, createdBy);
  }

  public async updateStatus(
    taskId: string,
    status: TaskStatus,
    memberRole: string,
    memberId: string,
    note?: string
  ): Promise<TaskItem> {
    return this.tasksRepo.updateStatus(taskId, status, memberRole, memberId, note);
  }
}
