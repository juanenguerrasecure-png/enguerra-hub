import { CalendarEvent } from '../../src/types';
import { EventsRepository } from '../repositories/eventsRepository';
import { AuditRepository } from '../repositories/auditRepository';

export class CalendarService {
  private eventsRepo = new EventsRepository();
  private auditRepo = new AuditRepository();

  public async getEvents(memberRole: string, memberId: string, isHubLocked: boolean = false): Promise<CalendarEvent[]> {
    return this.eventsRepo.getAuthorizedEvents(memberRole, memberId, isHubLocked);
  }

  public async createEvent(eventData: {
    title: string;
    description?: string;
    startTime: string;
    endTime: string;
    location?: string;
    assignedMembers?: string[];
    visibility?: any;
    category?: any;
    color?: string;
  }, createdByMemberId: string): Promise<CalendarEvent> {
    const eventId = `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const d = eventData as any;
    const event = await this.eventsRepo.create({
      Event_ID: eventId,
      Title: d.Title || d.title || 'Family Event',
      Description: d.Description || d.description || '',
      Start_Time: d.Start_Time || d.startTime,
      End_Time: d.End_Time || d.endTime,
      Location: d.Location || d.location || '',
      Assigned_Members: d.Assigned_Members || d.assignedMembers || [createdByMemberId],
      Visibility: d.Visibility || d.visibility || 'FAMILY',
      Category: d.Category || d.category || 'FAMILY',
      Color: d.Color || d.color || '#7A5AF8',
      Created_By: createdByMemberId,
      Deleted_At: null,
      Recurrence_Rule: d.Recurrence_Rule || d.recurrenceRule || 'NONE',
      Recurrence_Until: d.Recurrence_Until || d.recurrenceUntil || null,
    });

    await this.auditRepo.logActivity({
      memberId: createdByMemberId,
      action: 'CREATE_EVENT',
      entityType: 'EVENT',
      entityId: eventId,
      details: { title: eventData.title },
    });

    return event;
  }

  public async updateEvent(event: Partial<CalendarEvent> & { Event_ID: string }, memberId: string): Promise<void> {
    await this.eventsRepo.update(event);
    await this.auditRepo.logActivity({
      memberId,
      action: 'UPDATE_EVENT',
      entityType: 'EVENT',
      entityId: event.Event_ID,
    });
  }

  public async deleteEvent(eventId: string, memberId: string): Promise<void> {
    await this.eventsRepo.delete(eventId);
    await this.auditRepo.logActivity({
      memberId,
      action: 'DELETE_EVENT',
      entityType: 'EVENT',
      entityId: eventId,
    });
  }
}
