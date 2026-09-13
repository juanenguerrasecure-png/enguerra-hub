import { TaskItem, TaskResponsibility, TaskHistoryEntry, TaskStatus } from '../../src/types';
import { GoogleSheetsTasksRepository } from './googleSheetsTasksRepository';

export class TasksRepository {
  private repo = GoogleSheetsTasksRepository.getInstance();

  public async getTasks(memberRole: string, memberId: string, isHubLocked: boolean = false): Promise<TaskItem[]> {
    return this.repo.getTasks({ memberRole, memberId, isHubLocked });
  }

  public async getResponsibilities(assignedMemberId?: string): Promise<TaskResponsibility[]> {
    return this.repo.getResponsibilities(assignedMemberId);
  }

  public async getHistory(taskId?: string, memberId?: string): Promise<TaskHistoryEntry[]> {
    return this.repo.getHistory(taskId, memberId);
  }

  public async createTask(task: Omit<TaskItem, 'Version' | 'Created_At' | 'Updated_At'>): Promise<void> {
    await this.repo.createTask({
      title: task.Title,
      description: task.Description,
      dueDate: task.Due_Date,
      assignedTo: task.Assigned_To,
      category: task.Category,
      priority: task.Priority,
      visibility: task.Visibility,
      points: task.Points,
    }, task.Created_By);
  }

  public async updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    updatedByMemberId: string,
    note?: string
  ): Promise<TaskItem> {
    return this.repo.updateStatus(taskId, status, 'OWNER', updatedByMemberId, note);
  }
}
