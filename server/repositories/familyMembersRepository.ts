import { FamilyMember } from '../../src/types';
import { SheetStore } from '../storage/sheetStore';
import { LegacyAuthService } from '../services/legacyAuthService';

export class FamilyMembersRepository {
  private store = SheetStore.getInstance();

  public async getAll(): Promise<FamilyMember[]> {
    const raw = await this.store.getTableRecords<any>('Family_Members');
    return raw.map(r => ({
      Member_ID: r.Member_ID,
      First_Name: r.First_Name,
      Last_Name: r.Last_Name,
      Display_Name: r.Display_Name,
      Role: r.Role,
      Birth_Date: r.Birth_Date,
      Color: r.Color,
      Avatar_Key: r.Avatar_Key,
      Avatar_URL: r.Avatar_URL,
      Avatar_Media_ID: r.Avatar_Media_ID,
      Status: r.Status,
      Created_At: r.Created_At,
      Updated_At: r.Updated_At,
      Version: Number(r.Version) || 1,
      Deleted_At: r.Deleted_At || null,
    }));
  }

  public async getById(memberId: string): Promise<FamilyMember | null> {
    const all = await this.getAll();
    return all.find(m => m.Member_ID === memberId) || null;
  }

  public async getAuthSecrets(memberId: string): Promise<{ pinHash: string; pinSalt: string } | null> {
    const raw = await this.store.getTableRecords<any>('Family_Members');
    const member = raw.find(m => m.Member_ID === memberId);
    if (!member) return null;
    return {
      pinHash: member.Pin_Hash || '',
      pinSalt: member.Pin_Salt || '',
    };
  }

  public async update(member: Partial<FamilyMember> & { Member_ID: string }): Promise<void> {
    await this.store.upsertRecord('Family_Members', 'Member_ID', member);
  }

  public async updateProfile(
    memberId: string,
    updates: {
      First_Name?: string;
      Last_Name?: string;
      Display_Name?: string;
      Role?: 'OWNER' | 'ADMIN' | 'CHILD';
      Birth_Date?: string;
      Color?: string;
      Avatar_Key?: string;
      Avatar_URL?: string;
      Avatar_Media_ID?: string;
      Status?: 'ACTIVE' | 'INACTIVE';
      pin?: string;
    }
  ): Promise<FamilyMember> {
    const existing = await this.getById(memberId);
    if (!existing) {
      throw new Error(`Member with ID ${memberId} not found`);
    }

    const updatedRecord: any = {
      Member_ID: memberId,
    };

    if (updates.First_Name !== undefined) updatedRecord.First_Name = updates.First_Name.trim();
    if (updates.Last_Name !== undefined) updatedRecord.Last_Name = updates.Last_Name.trim();
    if (updates.Display_Name !== undefined) updatedRecord.Display_Name = updates.Display_Name.trim();
    if (updates.Role !== undefined) updatedRecord.Role = updates.Role;
    if (updates.Birth_Date !== undefined) updatedRecord.Birth_Date = updates.Birth_Date;
    if (updates.Color !== undefined) updatedRecord.Color = updates.Color;
    if (updates.Avatar_Key !== undefined) updatedRecord.Avatar_Key = updates.Avatar_Key;
    if (updates.Avatar_URL !== undefined) updatedRecord.Avatar_URL = updates.Avatar_URL;
    if (updates.Avatar_Media_ID !== undefined) updatedRecord.Avatar_Media_ID = updates.Avatar_Media_ID;
    if (updates.Status !== undefined) updatedRecord.Status = updates.Status;

    // Handle PIN update with exact Apps Script SHA-256 + salt parity
    if (updates.pin && updates.pin.trim().length >= 4) {
      const pin = updates.pin.trim();
      const salt = `SALT_${(updatedRecord.First_Name || existing.First_Name).toUpperCase()}_ENGUERRA_${Date.now()}`;
      const hash = LegacyAuthService.hashSha256(pin, salt);

      updatedRecord.Pin_Hash = hash;
      updatedRecord.Pin_Salt = salt;

      // Update Access_Credentials tab in sync
      await this.store.upsertRecord('Access_Credentials', 'Credential_ID', {
        Credential_ID: `cred-${memberId}`,
        Member_ID: memberId,
        Pin_Hash: hash,
        Pin_Salt: salt,
        Algorithm: 'APPS_SCRIPT_SHA256_SALT_PREFIX',
        Iterations: 1,
        Updated_At: new Date().toISOString(),
      });
    }

    await this.store.upsertRecord('Family_Members', 'Member_ID', updatedRecord);
    const refreshed = await this.getById(memberId);
    return refreshed!;
  }
}
