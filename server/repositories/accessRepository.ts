import { AccessPermission, UserPreferences } from '../../src/types';
import { SheetStore } from '../storage/sheetStore';

export class AccessRepository {
  private store = SheetStore.getInstance();

  public async getPermissionsForMember(memberId: string): Promise<AccessPermission[]> {
    const raw = await this.store.getTableRecords<any>('Access');
    return raw
      .filter(r => r.Member_ID === memberId)
      .map(r => ({
        Access_ID: r.Access_ID,
        Member_ID: r.Member_ID,
        Resource: r.Resource,
        Action: r.Action,
        Allowed: String(r.Allowed) === 'true',
        Created_At: r.Created_At,
        Updated_At: r.Updated_At,
      }));
  }

  public async getPreferences(memberId: string): Promise<UserPreferences | null> {
    const raw = await this.store.getTableRecords<any>('User_Preferences');
    const pref = raw.find(r => r.Member_ID === memberId);
    if (!pref) return null;
    return {
      Preference_ID: pref.Preference_ID,
      Member_ID: pref.Member_ID,
      Theme: pref.Theme || 'warm',
      Notifications_Enabled: String(pref.Notifications_Enabled) !== 'false',
      Hub_Ambient_Interval: Number(pref.Hub_Ambient_Interval) || 20,
      Settings_JSON: pref.Settings_JSON || '{}',
      Updated_At: pref.Updated_At,
    };
  }

  public async savePreferences(pref: UserPreferences): Promise<void> {
    await this.store.upsertRecord('User_Preferences', 'Preference_ID', pref);
  }
}
