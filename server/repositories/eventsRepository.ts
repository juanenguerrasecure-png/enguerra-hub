import { CalendarEvent, EntityVisibility } from '../../src/types';
import { SheetStore } from '../storage/sheetStore';

export class EventsRepository {
  private store = SheetStore.getInstance();

  public async getAll(): Promise<CalendarEvent[]> {
    const raw = await this.store.getTableRecords<any>('Events');
    return raw.map(r => {
      let assigned: string[] = [];
      try {
        assigned = typeof r.Assigned_Members === 'string' && r.Assigned_Members.startsWith('[')
          ? JSON.parse(r.Assigned_Members)
          : (r.Assigned_Members ? [r.Assigned_Members] : []);
      } catch {
        assigned = [];
      }

      return {
        Event_ID: r.Event_ID,
        Title: r.Title,
        Description: r.Description || '',
        Start_Time: r.Start_Time,
        End_Time: r.End_Time,
        Location: r.Location || '',
        Assigned_Members: assigned,
        Visibility: (r.Visibility || 'FAMILY') as EntityVisibility,
        Category: r.Category || 'FAMILY',
        Color: r.Color || '#C2410C',
        Created_By: r.Created_By,
        Created_At: r.Created_At,
        Updated_At: r.Updated_At,
        Version: Number(r.Version) || 1,
        Deleted_At: r.Deleted_At || null,
      };
    });
  }

  public async getAuthorizedEvents(memberRole: string, memberId: string, isHubLocked: boolean = false): Promise<CalendarEvent[]> {
    const all = await this.getAll();

    return all.filter(event => {
      if (event.Deleted_At) return false;

      // Hub in locked/unattended mode
      if (isHubLocked) {
        return event.Visibility === 'FAMILY' || event.Visibility === 'HUB';
      }

      // Parents/Owner/Admin see everything
      if (memberRole === 'OWNER' || memberRole === 'ADMIN') {
        return true;
      }

      // Children can only see FAMILY or events directly assigned to them with non-private visibility
      if (memberRole === 'CHILD') {
        if (event.Visibility === 'PARENTS_ONLY') return false;
        if (event.Visibility === 'PRIVATE' && event.Created_By !== memberId) return false;
        return true;
      }

      return event.Visibility === 'FAMILY';
    });
  }

  public async create(event: Omit<CalendarEvent, 'Version' | 'Created_At' | 'Updated_At'>): Promise<CalendarEvent> {
    const entity = {
      ...event,
      Assigned_Members: JSON.stringify(event.Assigned_Members),
    };
    await this.store.upsertRecord('Events', 'Event_ID', entity);
    const created = await this.store.getRecordById<any>('Events', 'Event_ID', event.Event_ID);
    return {
      ...created,
      Assigned_Members: event.Assigned_Members,
    };
  }

  public async update(event: Partial<CalendarEvent> & { Event_ID: string; Version?: number }): Promise<void> {
    const entity: any = { ...event };
    if (event.Assigned_Members) {
      entity.Assigned_Members = JSON.stringify(event.Assigned_Members);
    }
    await this.store.upsertRecord('Events', 'Event_ID', entity);
  }

  public async delete(eventId: string): Promise<void> {
    await this.store.softDeleteRecord('Events', 'Event_ID', eventId);
  }
}
