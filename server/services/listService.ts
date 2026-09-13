import { FamilyList, FamilyListItem } from '../../src/types';
import { ListsRepository } from '../repositories/listsRepository';
import { AuditRepository } from '../repositories/auditRepository';

export class ListService {
  private listsRepo = new ListsRepository();
  private auditRepo = new AuditRepository();

  public async getLists(memberRole: string, memberId: string, isHubLocked: boolean = false): Promise<FamilyList[]> {
    return this.listsRepo.getLists(memberRole, memberId, isHubLocked);
  }

  public async getListItems(listId: string): Promise<FamilyListItem[]> {
    return this.listsRepo.getListItems(listId);
  }

  public async createList(data: { title: string; category?: any; icon?: string; visibility?: any }, createdBy: string): Promise<void> {
    const listId = `list-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await this.listsRepo.createList({
      List_ID: listId,
      Title: data.title,
      Category: data.category || 'GENERAL',
      Icon: data.icon || 'ShoppingCart',
      Visibility: data.visibility || 'FAMILY',
      Created_By: createdBy,
      Deleted_At: null,
    });

    await this.auditRepo.logActivity({
      memberId: createdBy,
      action: 'CREATE_LIST',
      entityType: 'LIST',
      entityId: listId,
      details: { title: data.title },
    });
  }

  public async addItem(data: { listId: string; title: string; quantity?: string }, addedBy: string): Promise<void> {
    const itemId = `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await this.listsRepo.addItem({
      Item_ID: itemId,
      List_ID: data.listId,
      Title: data.title,
      Quantity: data.quantity || '',
      Completed: false,
      Completed_By: null,
      Added_By: addedBy,
      Deleted_At: null,
    });
  }

  public async toggleItem(itemId: string, completed: boolean, memberId: string): Promise<void> {
    await this.listsRepo.toggleItem(itemId, completed, memberId);
  }

  public async deleteItem(itemId: string, memberId: string): Promise<void> {
    await this.listsRepo.deleteItem(itemId);
  }
}
