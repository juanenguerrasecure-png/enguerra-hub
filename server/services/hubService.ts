import { CalendarEvent, TaskItem, FamilyList, MediaFile, FamilyMember } from '../../src/types';
import { EventsRepository } from '../repositories/eventsRepository';
import { TasksRepository } from '../repositories/tasksRepository';
import { ListsRepository } from '../repositories/listsRepository';
import { MediaRepository } from '../repositories/mediaRepository';
import { FamilyMembersRepository } from '../repositories/familyMembersRepository';

export interface HubBootstrapData {
  members: FamilyMember[];
  todaysEvents: CalendarEvent[];
  pendingTasks: TaskItem[];
  groceryLists: FamilyList[];
  ambientPhotos: MediaFile[];
  hubConfig: {
    ambientIntervalSeconds: number;
    autoLockSeconds: number;
    isParentUnlocked: boolean;
    weatherCity: string;
  };
}

export class HubService {
  private eventsRepo = new EventsRepository();
  private tasksRepo = new TasksRepository();
  private listsRepo = new ListsRepository();
  private mediaRepo = new MediaRepository();
  private membersRepo = new FamilyMembersRepository();

  public async getHubData(isParentUnlocked: boolean = false, parentMemberId?: string): Promise<HubBootstrapData> {
    const role = isParentUnlocked ? 'OWNER' : 'CHILD';
    const memberId = parentMemberId || 'hub-device';
    const isHubLocked = !isParentUnlocked;

    const [members, events, tasks, lists, photos] = await Promise.all([
      this.membersRepo.getAll(),
      this.eventsRepo.getAuthorizedEvents(role, memberId, isHubLocked),
      this.tasksRepo.getTasks(role, memberId, isHubLocked),
      this.listsRepo.getLists(role, memberId, isHubLocked),
      this.mediaRepo.getMediaFiles(role, memberId, isHubLocked),
    ]);

    return {
      members: members.filter(m => !m.Deleted_At && m.Status === 'ACTIVE'),
      todaysEvents: events,
      pendingTasks: tasks.filter(t => t.Status !== 'APPROVED'),
      groceryLists: lists,
      ambientPhotos: photos.filter(p => p.Linked_Entity_Type === 'ALBUM' || p.Visibility === 'FAMILY'),
      hubConfig: {
        ambientIntervalSeconds: 20,
        autoLockSeconds: 120,
        isParentUnlocked,
        weatherCity: 'New York, NY',
      },
    };
  }
}
