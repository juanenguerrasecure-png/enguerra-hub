import { FamilyList, FamilyListItem, EntityVisibility } from '../../src/types';
import { SheetStore } from '../storage/sheetStore';

export class ListsRepository {
  private store = SheetStore.getInstance();

  public async getLists(memberRole: string, memberId: string, isHubLocked: boolean = false): Promise<FamilyList[]> {
    const raw = await this.store.getTableRecords<any>('Lists');
    const lists: FamilyList[] = raw.map(r => ({
      List_ID: r.List_ID,
      Title: r.Title,
      Category: r.Category || 'GENERAL',
      Icon: r.Icon || 'ShoppingCart',
      Visibility: (r.Visibility || 'FAMILY') as EntityVisibility,
      Created_By: r.Created_By,
      Created_At: r.Created_At,
      Updated_At: r.Updated_At,
      Version: Number(r.Version) || 1,
      Deleted_At: r.Deleted_At || null,
    }));

    return lists.filter(l => {
      if (l.Deleted_At) return false;
      if (isHubLocked) return l.Visibility === 'FAMILY' || l.Visibility === 'HUB';
      if (memberRole === 'OWNER' || memberRole === 'ADMIN') return true;
      if (memberRole === 'CHILD') {
        return l.Visibility === 'FAMILY' || (l.Visibility === 'PRIVATE' && l.Created_By === memberId);
      }
      return l.Visibility === 'FAMILY';
    });
  }

  public async getListItems(listId: string): Promise<FamilyListItem[]> {
    const raw = await this.store.getTableRecords<any>('List_Items');
    return raw
      .filter(r => r.List_ID === listId && !r.Deleted_At)
      .map(r => ({
        Item_ID: r.Item_ID,
        List_ID: r.List_ID,
        Title: r.Title,
        Quantity: r.Quantity || '',
        Completed: String(r.Completed) === 'true',
        Completed_By: r.Completed_By || null,
        Added_By: r.Added_By,
        Created_At: r.Created_At,
        Updated_At: r.Updated_At,
        Version: Number(r.Version) || 1,
        Deleted_At: r.Deleted_At || null,
      }));
  }

  public async createList(list: Omit<FamilyList, 'Version' | 'Created_At' | 'Updated_At'>): Promise<void> {
    await this.store.upsertRecord('Lists', 'List_ID', list);
  }

  public async addItem(item: Omit<FamilyListItem, 'Version' | 'Created_At' | 'Updated_At'>): Promise<void> {
    await this.store.upsertRecord('List_Items', 'Item_ID', item);
  }

  public async toggleItem(itemId: string, completed: boolean, memberId: string): Promise<void> {
    const raw = await this.store.getRecordById<any>('List_Items', 'Item_ID', itemId);
    if (!raw) return;

    await this.store.upsertRecord('List_Items', 'Item_ID', {
      ...raw,
      Completed: completed,
      Completed_By: completed ? memberId : null,
      Version: raw.Version,
    });
  }

  public async deleteItem(itemId: string): Promise<void> {
    await this.store.softDeleteRecord('List_Items', 'Item_ID', itemId);
  }
}
