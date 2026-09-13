import { ChatThread, ChatMessage } from '../../src/types';
import { MessagesRepository } from '../repositories/messagesRepository';
import { AuditRepository } from '../repositories/auditRepository';

export class MessageService {
  private messagesRepo = new MessagesRepository();
  private auditRepo = new AuditRepository();

  public async getThreads(memberRole: string, memberId: string): Promise<ChatThread[]> {
    return this.messagesRepo.getThreadsForMember(memberRole, memberId);
  }

  public async getMessages(threadId: string, memberRole: string, memberId: string): Promise<ChatMessage[]> {
    return this.messagesRepo.getMessages(threadId, memberRole, memberId);
  }

  public async sendMessage(params: {
    threadId: string;
    senderId: string;
    content: string;
    attachmentDriveId?: string;
    attachmentMime?: string;
    attachmentName?: string;
  }): Promise<ChatMessage> {
    const msg = await this.messagesRepo.postMessage(params);
    await this.auditRepo.logActivity({
      memberId: params.senderId,
      action: 'SEND_MESSAGE',
      entityType: 'CHAT',
      entityId: msg.Message_ID,
      details: { threadId: params.threadId },
    });
    return msg;
  }

  public async markAsRead(threadId: string, memberId: string, lastMessageId: string): Promise<void> {
    await this.messagesRepo.updateReadState(threadId, memberId, lastMessageId);
  }
}
