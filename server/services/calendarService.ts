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
    const event = await this.eventsRepo.create({
      Event_ID: eventId,
      Title: eventData.title,
      Description: eventData.description || '',
      Start_Time: eventData.startTime,
      End_Time: eventData.endTime,
      Location: eventData.location || '',
      Assigned_Members: eventData.assignedMembers || [createdByMemberId],
      Visibility: eventData.visibility || 'FAMILY',
      Category: eventData.category || 'FAMILY',
      Color: eventData.color || '#C2410C',
      Created_By: createdByMemberId,
      Deleted_At: null,
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
