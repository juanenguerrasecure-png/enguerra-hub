import { ChatThread, ChatMessage, ChatReadState } from '../../src/types';
import { SheetStore } from '../storage/sheetStore';

export class MessagesRepository {
  private store = SheetStore.getInstance();

  public async getThreadsForMember(memberRole: string, memberId: string): Promise<ChatThread[]> {
    const raw = await this.store.getTableRecords<any>('Chat_Threads');
    const threads: ChatThread[] = raw.map(r => {
      let participants: string[] = [];
      try {
        participants = typeof r.Participant_IDs === 'string' && r.Participant_IDs.startsWith('[')
          ? JSON.parse(r.Participant_IDs)
          : (r.Participant_IDs ? [r.Participant_IDs] : []);
      } catch {
        participants = [];
      }

      return {
        Thread_ID: r.Thread_ID,
        Title: r.Title,
        Thread_Type: r.Thread_Type || 'FAMILY',
        Participant_IDs: participants,
        Last_Message_At: r.Last_Message_At,
        Created_At: r.Created_At,
        Updated_At: r.Updated_At,
        Version: Number(r.Version) || 1,
        Deleted_At: r.Deleted_At || null,
      };
    });

    return threads.filter(t => {
      if (t.Deleted_At) return false;
      if (memberRole === 'OWNER' || memberRole === 'ADMIN') return true;
      // Child can never access PARENTS thread
      if (memberRole === 'CHILD') {
        if (t.Thread_Type === 'PARENTS') return false;
        return t.Thread_Type === 'FAMILY' || t.Participant_IDs.includes(memberId);
      }
      return t.Thread_Type === 'FAMILY';
    });
  }

  public async getMessages(threadId: string, memberRole: string, memberId: string): Promise<ChatMessage[]> {
    const threads = await this.getThreadsForMember(memberRole, memberId);
    const authorized = threads.some(t => t.Thread_ID === threadId);
    if (!authorized) {
      throw new Error('ACCESS_DENIED: You are not authorized to view messages in this thread');
    }

    const raw = await this.store.getTableRecords<any>('Chat_Messages');
    return raw
      .filter(m => m.Thread_ID === threadId && !m.Deleted_At)
      .map(m => ({
        Message_ID: m.Message_ID,
        Thread_ID: m.Thread_ID,
        Sender_ID: m.Sender_ID,
        Content: m.Content,
        Attachment_Drive_ID: m.Attachment_Drive_ID || undefined,
        Attachment_Mime: m.Attachment_Mime || undefined,
        Attachment_Name: m.Attachment_Name || undefined,
        Created_At: m.Created_At,
        Updated_At: m.Updated_At,
        Version: Number(m.Version) || 1,
        Deleted_At: m.Deleted_At || null,
      }))
      .sort((a, b) => new Date(a.Created_At).getTime() - new Date(b.Created_At).getTime());
  }

  public async postMessage(params: {
    threadId: string;
    senderId: string;
    content: string;
    attachmentDriveId?: string;
    attachmentMime?: string;
    attachmentName?: string;
  }): Promise<ChatMessage> {
    const message: ChatMessage = {
      Message_ID: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      Thread_ID: params.threadId,
      Sender_ID: params.senderId,
      Content: params.content,
      Attachment_Drive_ID: params.attachmentDriveId,
      Attachment_Mime: params.attachmentMime,
      Attachment_Name: params.attachmentName,
      Created_At: new Date().toISOString(),
      Updated_At: new Date().toISOString(),
      Version: 1,
      Deleted_At: null,
    };

    await this.store.upsertRecord('Chat_Messages', 'Message_ID', message);

    // Update thread Last_Message_At
    const rawThread = await this.store.getRecordById<any>('Chat_Threads', 'Thread_ID', params.threadId);
    if (rawThread) {
      await this.store.upsertRecord('Chat_Threads', 'Thread_ID', {
        ...rawThread,
        Last_Message_At: message.Created_At,
        Version: rawThread.Version,
      });
    }

    return message;
  }

  public async updateReadState(threadId: string, memberId: string, lastMessageId: string): Promise<void> {
    const id = `read-${threadId}-${memberId}`;
    await this.store.upsertRecord('Chat_Read_State', 'Read_State_ID', {
      Read_State_ID: id,
      Thread_ID: threadId,
      Member_ID: memberId,
      Last_Read_Message_ID: lastMessageId,
      Last_Read_At: new Date().toISOString(),
      Version: 1,
    });
  }
}
