/**
 * Enguerra of NY - Google Sheets Family Repository
 *
 * Direct repository layer interfacing with the "Family_Members" Google Sheets tab
 * as defined in .env (SHEET_TAB_FAMILY_MEMBERS or default "Family_Members").
 *
 * Implements:
 * - Direct Google Sheets v4 REST API reading and writing
 * - Dynamic column header resolution (resilient to spreadsheet column reordering)
 * - Two-way synchronization with local authoritative SheetStore (instant cache & offline resilience)
 * - Optimistic concurrency versioning
 * - Apps Script SHA-256 + salt password credential parity
 */

import { FamilyMember, FamilyRole } from '../../src/types';
import { GoogleSheetsClient } from '../google/sheets';
import { isGoogleConfigured } from '../google/auth';
import { SheetStore } from '../storage/sheetStore';
import { GoogleSheetsService } from '../services/googleSheetsService';
import { LegacyAuthService } from '../services/legacyAuthService';

export interface FamilySummary {
  totalMembers: number;
  parentsCount: number;
  childrenCount: number;
  activeCount: number;
  members: FamilyMember[];
}

export class GoogleSheetsFamilyRepository {
  private static instance: GoogleSheetsFamilyRepository;
  private sheetsService = GoogleSheetsService.getInstance();
  private localStore = SheetStore.getInstance();
  private client: GoogleSheetsClient;
  private tabName: string;

  constructor() {
    const config = this.sheetsService.getConfig();
    this.client = new GoogleSheetsClient(config.spreadsheetId);
    this.tabName = config.membersTab || 'Family_Members';
  }

  public static getInstance(): GoogleSheetsFamilyRepository {
    if (!GoogleSheetsFamilyRepository.instance) {
      GoogleSheetsFamilyRepository.instance = new GoogleSheetsFamilyRepository();
    }
    return GoogleSheetsFamilyRepository.instance;
  }

  public getTabName(): string {
    return this.tabName;
  }

  public getSpreadsheetId(): string {
    return this.sheetsService.getConfig().spreadsheetId;
  }

  /**
   * Fetches all family members from the Family_Members Google Sheets tab
   */
  public async getAll(options: { includeInactive?: boolean; includeDeleted?: boolean } = {}): Promise<FamilyMember[]> {
    const config = this.sheetsService.getConfig();

    if (config.isConfigured) {
      try {
        const rows = await this.client.getValues(`${this.tabName}!A1:Z`);
        if (rows && rows.length > 1) {
          const headers = rows[0].map(h => (h || '').trim());
          const headerMap = new Map<string, number>();
          headers.forEach((h, idx) => headerMap.set(h.toLowerCase(), idx));

          const members: FamilyMember[] = [];
          for (let i = 1; i < rows.length; i++) {
            const member = this.rowToMember(rows[i], headerMap);
            if (!member) continue;
            if (!options.includeDeleted && member.Deleted_At) continue;
            if (!options.includeInactive && member.Status === 'INACTIVE') continue;
            members.push(member);
          }

          // Keep local store in sync with live sheet data
          for (const m of members) {
            try {
              await this.localStore.upsertRecord('Family_Members', 'Member_ID', m);
            } catch {
              // Ignore local cache update glitches
            }
          }

          return members;
        }
      } catch (err: any) {
        console.warn(`[GoogleSheetsFamilyRepository] Failed live read from ${this.tabName}:`, err.message);
      }
    }

    // Fallback to local store
    const local = await this.localStore.getTableRecords<any>('Family_Members');
    return local
      .map(r => ({
        Member_ID: r.Member_ID,
        First_Name: r.First_Name,
        Last_Name: r.Last_Name,
        Display_Name: r.Display_Name,
        Role: r.Role as FamilyRole,
        Birth_Date: r.Birth_Date,
        Color: r.Color,
        Avatar_Key: r.Avatar_Key,
        Avatar_URL: r.Avatar_URL,
        Avatar_Media_ID: r.Avatar_Media_ID,
        Status: (r.Status || 'ACTIVE') as 'ACTIVE' | 'INACTIVE',
        Created_At: r.Created_At,
        Updated_At: r.Updated_At,
        Version: Number(r.Version) || 1,
        Deleted_At: r.Deleted_At || null,
      }))
      .filter(m => {
        if (!options.includeDeleted && m.Deleted_At) return false;
        if (!options.includeInactive && m.Status === 'INACTIVE') return false;
        return true;
      });
  }

  /**
   * Fetches a single family member by Member_ID
   */
  public async getById(memberId: string): Promise<FamilyMember | null> {
    const all = await this.getAll({ includeInactive: true, includeDeleted: true });
    return all.find(m => m.Member_ID === memberId && !m.Deleted_At) || null;
  }

  /**
   * Computes summary stats for the Enguerra family
   */
  public async getFamilySummary(): Promise<FamilySummary> {
    const members = await this.getAll({ includeInactive: true });
    const active = members.filter(m => m.Status === 'ACTIVE');
    const parents = members.filter(m => m.Role === 'OWNER' || m.Role === 'ADMIN');
    const children = members.filter(m => m.Role === 'CHILD');

    return {
      totalMembers: members.length,
      parentsCount: parents.length,
      childrenCount: children.length,
      activeCount: active.length,
      members,
    };
  }

  /**
   * Creates a new family member in the Family_Members Google Sheets tab
   */
  public async createMember(
    data: {
      firstName: string;
      lastName?: string;
      displayName?: string;
      role: FamilyRole;
      birthDate: string;
      color?: string;
      avatarKey?: string;
      avatarUrl?: string;
      pin?: string;
    },
    creatorId?: string
  ): Promise<FamilyMember> {
    const slug = data.firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const memberId = `mem-${slug}-${data.role.toLowerCase()}-${Date.now().toString(36).slice(-4)}`;
    const now = new Date().toISOString();

    let pinHash = '';
    let pinSalt = '';
    if (data.pin && data.pin.trim().length >= 4) {
      pinSalt = `SALT_${data.firstName.toUpperCase()}_ENGUERRA_${Date.now()}`;
      pinHash = LegacyAuthService.hashSha256(data.pin.trim(), pinSalt);
    }

    const newMember: FamilyMember = {
      Member_ID: memberId,
      First_Name: data.firstName.trim(),
      Last_Name: (data.lastName || 'Enguerra').trim(),
      Display_Name: (data.displayName || data.firstName).trim(),
      Role: data.role,
      Birth_Date: data.birthDate,
      Color: data.color || '#0284C7',
      Avatar_Key: data.avatarKey || slug,
      Avatar_URL: data.avatarUrl || '',
      Avatar_Media_ID: `media-avatar-${slug}`,
      Status: 'ACTIVE',
      Created_At: now,
      Updated_At: now,
      Version: 1,
      Deleted_At: null,
    };

    // Update local store
    await this.localStore.upsertRecord('Family_Members', 'Member_ID', {
      ...newMember,
      Pin_Hash: pinHash,
      Pin_Salt: pinSalt,
    });

    if (pinHash) {
      await this.localStore.upsertRecord('Access_Credentials', 'Credential_ID', {
        Credential_ID: `cred-${memberId}`,
        Member_ID: memberId,
        Pin_Hash: pinHash,
        Pin_Salt: pinSalt,
        Algorithm: 'APPS_SCRIPT_SHA256_SALT_PREFIX',
        Iterations: 1,
        Updated_At: now,
      });
    }

    // Sync to live Google Sheets tab if configured
    if (this.sheetsService.getConfig().isConfigured) {
      try {
        const row = [
          newMember.Member_ID,
          newMember.First_Name,
          newMember.Last_Name,
          newMember.Display_Name,
          newMember.Role,
          newMember.Birth_Date,
          newMember.Color,
          newMember.Avatar_Key || '',
          newMember.Avatar_URL || '',
          newMember.Avatar_Media_ID || '',
          pinHash,
          pinSalt,
          newMember.Status,
          newMember.Created_At,
          newMember.Updated_At,
          String(newMember.Version),
          '', // Deleted_At
        ];
        await this.client.appendValues(this.tabName, [row]);
        console.log(`[GoogleSheetsFamilyRepository] Appended member ${memberId} to live Google Sheets tab "${this.tabName}"`);
      } catch (err: any) {
        console.warn(`[GoogleSheetsFamilyRepository] Live Google Sheet append failed:`, err.message);
      }
    }

    return newMember;
  }

  /**
   * Updates a member profile in the Family_Members Google Sheets tab
   */
  public async updateMember(
    memberId: string,
    updates: Partial<FamilyMember> & { pin?: string }
  ): Promise<FamilyMember> {
    const existing = await this.getById(memberId);
    if (!existing) {
      throw new Error(`Member with ID "${memberId}" not found in ${this.tabName}`);
    }

    const now = new Date().toISOString();
    const newVersion = (existing.Version || 1) + 1;

    const updated: FamilyMember = {
      ...existing,
      First_Name: updates.First_Name !== undefined ? updates.First_Name.trim() : existing.First_Name,
      Last_Name: updates.Last_Name !== undefined ? updates.Last_Name.trim() : existing.Last_Name,
      Display_Name: updates.Display_Name !== undefined ? updates.Display_Name.trim() : existing.Display_Name,
      Role: updates.Role !== undefined ? updates.Role : existing.Role,
      Birth_Date: updates.Birth_Date !== undefined ? updates.Birth_Date : existing.Birth_Date,
      Color: updates.Color !== undefined ? updates.Color : existing.Color,
      Avatar_Key: updates.Avatar_Key !== undefined ? updates.Avatar_Key : existing.Avatar_Key,
      Avatar_URL: updates.Avatar_URL !== undefined ? updates.Avatar_URL : existing.Avatar_URL,
      Avatar_Media_ID: updates.Avatar_Media_ID !== undefined ? updates.Avatar_Media_ID : existing.Avatar_Media_ID,
      Status: updates.Status !== undefined ? updates.Status : existing.Status,
      Updated_At: now,
      Version: newVersion,
    };

    const recordForStore: any = { ...updated };

    // Handle PIN update
    if (updates.pin && updates.pin.trim().length >= 4) {
      const pin = updates.pin.trim();
      const salt = `SALT_${updated.First_Name.toUpperCase()}_ENGUERRA_${Date.now()}`;
      const hash = LegacyAuthService.hashSha256(pin, salt);
      recordForStore.Pin_Hash = hash;
      recordForStore.Pin_Salt = salt;

      await this.localStore.upsertRecord('Access_Credentials', 'Credential_ID', {
        Credential_ID: `cred-${memberId}`,
        Member_ID: memberId,
        Pin_Hash: hash,
        Pin_Salt: salt,
        Algorithm: 'APPS_SCRIPT_SHA256_SALT_PREFIX',
        Iterations: 1,
        Updated_At: now,
      });
    }

    // Save to local store
    await this.localStore.upsertRecord('Family_Members', 'Member_ID', recordForStore);

    // Update in live Google Sheets tab
    if (this.sheetsService.getConfig().isConfigured) {
      try {
        const rows = await this.client.getValues(`${this.tabName}!A1:Z`);
        if (rows && rows.length > 1) {
          const headers = rows[0].map(h => (h || '').trim());
          const headerMap = new Map<string, number>();
          headers.forEach((h, idx) => headerMap.set(h.toLowerCase(), idx));
          const idCol = headerMap.get('member_id') ?? 0;

          const rowIndex = rows.findIndex((r, idx) => idx > 0 && r[idCol] === memberId);
          if (rowIndex > 0) {
            const sheetRowNumber = rowIndex + 1; // 1-indexed for Sheets
            const currentRow = [...rows[rowIndex]];

            const setVal = (key: string, val: string) => {
              const col = headerMap.get(key.toLowerCase());
              if (col !== undefined) {
                while (currentRow.length <= col) currentRow.push('');
                currentRow[col] = val;
              }
            };

            setVal('First_Name', updated.First_Name);
            setVal('Last_Name', updated.Last_Name);
            setVal('Display_Name', updated.Display_Name);
            setVal('Role', updated.Role);
            setVal('Birth_Date', updated.Birth_Date);
            setVal('Color', updated.Color);
            if (updated.Avatar_Key) setVal('Avatar_Key', updated.Avatar_Key);
            if (updated.Avatar_URL) setVal('Avatar_URL', updated.Avatar_URL);
            setVal('Status', updated.Status);
            setVal('Updated_At', updated.Updated_At);
            setVal('Version', String(updated.Version));
            if (recordForStore.Pin_Hash) {
              setVal('Pin_Hash', recordForStore.Pin_Hash);
              setVal('Pin_Salt', recordForStore.Pin_Salt);
            }

            await this.client.updateValues(`${this.tabName}!A${sheetRowNumber}:Z${sheetRowNumber}`, [currentRow]);
            console.log(`[GoogleSheetsFamilyRepository] Updated member ${memberId} in live Google Sheet row ${sheetRowNumber}`);
          }
        }
      } catch (err: any) {
        console.warn(`[GoogleSheetsFamilyRepository] Live Google Sheet update failed:`, err.message);
      }
    }

    return updated;
  }

  /**
   * Soft deletes a member in Family_Members
   */
  public async deleteMember(memberId: string): Promise<void> {
    const existing = await this.getById(memberId);
    if (!existing) return;

    const now = new Date().toISOString();
    await this.localStore.upsertRecord('Family_Members', 'Member_ID', {
      ...existing,
      Status: 'INACTIVE',
      Deleted_At: now,
      Updated_At: now,
      Version: (existing.Version || 1) + 1,
    });

    if (this.sheetsService.getConfig().isConfigured) {
      try {
        const rows = await this.client.getValues(`${this.tabName}!A1:Z`);
        if (rows && rows.length > 1) {
          const idCol = 0;
          const rowIndex = rows.findIndex((r, idx) => idx > 0 && r[idCol] === memberId);
          if (rowIndex > 0) {
            const sheetRowNumber = rowIndex + 1;
            const currentRow = [...rows[rowIndex]];
            // Mark deleted_at and inactive
            const headers = rows[0].map(h => (h || '').trim());
            const headerMap = new Map<string, number>();
            headers.forEach((h, idx) => headerMap.set(h.toLowerCase(), idx));

            const delCol = headerMap.get('deleted_at');
            const statusCol = headerMap.get('status');
            if (delCol !== undefined) {
              while (currentRow.length <= delCol) currentRow.push('');
              currentRow[delCol] = now;
            }
            if (statusCol !== undefined) {
              currentRow[statusCol] = 'INACTIVE';
            }
            await this.client.updateValues(`${this.tabName}!A${sheetRowNumber}:Z${sheetRowNumber}`, [currentRow]);
          }
        }
      } catch (err: any) {
        console.warn(`[GoogleSheetsFamilyRepository] Live Google Sheet soft delete failed:`, err.message);
      }
    }
  }

  /**
   * Retrieves authentication secrets for member PIN verification
   */
  public async getAuthSecrets(memberId: string): Promise<{ pinHash: string; pinSalt: string } | null> {
    const raw = await this.localStore.getTableRecords<any>('Family_Members');
    const member = raw.find(m => m.Member_ID === memberId);
    if (!member) return null;
    return {
      pinHash: member.Pin_Hash || '',
      pinSalt: member.Pin_Salt || '',
    };
  }

  private rowToMember(row: string[], headerMap: Map<string, number>): FamilyMember | null {
    const getVal = (k: string) => {
      const idx = headerMap.get(k.toLowerCase());
      if (idx === undefined || idx >= row.length) return '';
      return (row[idx] ?? '').toString().trim();
    };

    const id = getVal('Member_ID');
    if (!id) return null;

    return {
      Member_ID: id,
      First_Name: getVal('First_Name'),
      Last_Name: getVal('Last_Name') || 'Enguerra',
      Display_Name: getVal('Display_Name') || getVal('First_Name'),
      Role: (getVal('Role') || 'CHILD') as FamilyRole,
      Birth_Date: getVal('Birth_Date'),
      Color: getVal('Color') || '#0284C7',
      Avatar_Key: getVal('Avatar_Key') || undefined,
      Avatar_URL: getVal('Avatar_URL') || undefined,
      Avatar_Media_ID: getVal('Avatar_Media_ID') || undefined,
      Status: (getVal('Status') || 'ACTIVE') as 'ACTIVE' | 'INACTIVE',
      Created_At: getVal('Created_At') || new Date().toISOString(),
      Updated_At: getVal('Updated_At') || new Date().toISOString(),
      Version: parseInt(getVal('Version'), 10) || 1,
      Deleted_At: getVal('Deleted_At') || null,
    };
  }
}
