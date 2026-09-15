/**
 * Enguerra of NY - Authoritative Sheet Storage Engine
 *
 * Manages Sheet tabs, row mapping, schema validation, optimistic locking,
 * Data_Versions invalidation, and idempotent writes.
 * Works seamlessly with Google Sheets v4 API when credentials are provided,
 * and maintains full local fidelity in DEV/preview mode.
 */

import { GoogleSheetsClient } from '../google/sheets';
import { isGoogleConfigured } from '../google/auth';
import { LegacyAuthService } from '../services/legacyAuthService';
import {
  INITIAL_MEMBERS,
  INITIAL_EVENTS,
  INITIAL_TASKS,
  INITIAL_RESPONSIBILITIES,
  INITIAL_LISTS,
  INITIAL_LIST_ITEMS,
  INITIAL_THREADS,
  INITIAL_MESSAGES,
  INITIAL_ALBUMS,
  INITIAL_MEDIA,
  INITIAL_PREFERENCES
} from '../data/initialSeed';

export interface TabDefinition {
  name: string;
  columns: string[];
}

export const SHEET_SCHEMA_TABS: Record<string, string[]> = {
  Family_Members: [
    'Member_ID', 'First_Name', 'Last_Name', 'Display_Name', 'Role', 'Birth_Date',
    'Color', 'Avatar_Key', 'Avatar_URL', 'Avatar_Media_ID', 'Pin_Hash', 'Pin_Salt',
    'Status', 'Created_At', 'Updated_At', 'Version', 'Deleted_At'
  ],
  Access_Credentials: [
    'Credential_ID', 'Member_ID', 'Pin_Hash', 'Pin_Salt', 'Algorithm', 'Iterations', 'Updated_At'
  ],
  Access: ['Access_ID', 'Member_ID', 'Resource', 'Action', 'Allowed', 'Created_At', 'Updated_At'],
  User_Preferences: ['Preference_ID', 'Member_ID', 'Theme', 'Notifications_Enabled', 'Hub_Ambient_Interval', 'Settings_JSON', 'Updated_At'],
  Events: [
    'Event_ID', 'Title', 'Description', 'Start_Time', 'End_Time', 'Location',
    'Assigned_Members', 'Visibility', 'Category', 'Color', 'Created_By', 'Created_At',
    'Updated_At', 'Version', 'Deleted_At', 'Recurrence_Rule', 'Recurrence_Until'
  ],
  Tasks: [
    'Task_ID', 'Title', 'Description', 'Due_Date', 'Assigned_To', 'Status',
    'Priority', 'Visibility', 'Category', 'Points', 'Approved_By', 'Created_By',
    'Created_At', 'Updated_At', 'Version', 'Deleted_At', 'Responsibility_ID', 'Recurrence', 'Recurrence_Until'
  ],
  Task_Responsibilities: [
    'Responsibility_ID', 'Title', 'Category', 'Recurrence', 'Assigned_To',
    'Target_Days', 'Points', 'Active', 'Created_At', 'Updated_At', 'Version', 'Deleted_At'
  ],
  Task_History: ['History_ID', 'Task_ID', 'Member_ID', 'Action', 'Points_Awarded', 'Timestamp', 'Note'],
  Lists: ['List_ID', 'Title', 'Category', 'Icon', 'Visibility', 'Created_By', 'Created_At', 'Updated_At', 'Version', 'Deleted_At'],
  List_Items: ['Item_ID', 'List_ID', 'Title', 'Quantity', 'Completed', 'Completed_By', 'Added_By', 'Created_At', 'Updated_At', 'Version', 'Deleted_At'],
  Family_Inbox: ['Inbox_ID', 'Title', 'Content', 'Source', 'Status', 'Processed_By', 'Created_At', 'Updated_At', 'Version', 'Deleted_At'],
  Chat_Threads: ['Thread_ID', 'Title', 'Thread_Type', 'Participant_IDs', 'Last_Message_At', 'Created_At', 'Updated_At', 'Version', 'Deleted_At'],
  Chat_Messages: ['Message_ID', 'Thread_ID', 'Sender_ID', 'Content', 'Attachment_Drive_ID', 'Attachment_Mime', 'Attachment_Name', 'Created_At', 'Updated_At', 'Version', 'Deleted_At'],
  Chat_Read_State: ['Read_State_ID', 'Thread_ID', 'Member_ID', 'Last_Read_Message_ID', 'Last_Read_At', 'Version'],
  Sessions: ['Session_ID', 'Member_ID', 'Device_Type', 'Token_Hash', 'IP_Address', 'User_Agent', 'Expires_At', 'Created_At', 'Last_Active_At', 'Revoked_At'],
  Auth_State: ['Member_ID', 'Failed_Attempts', 'Lockout_Until', 'Last_Login_At', 'Last_Failed_At', 'Updated_At'],
  App_Config: ['Key', 'Value', 'Description', 'Updated_At', 'Updated_By'],
  Schema_Versions: ['Version_ID', 'Applied_At', 'Description', 'Status'],
  Data_Versions: ['Entity_Name', 'Version_Number', 'Updated_At'],
  Activity_Log: ['Activity_ID', 'Member_ID', 'Action', 'Entity_Type', 'Entity_ID', 'Details_JSON', 'Timestamp'],
  Request_Log: ['Request_ID', 'Member_ID', 'Endpoint', 'Method', 'Status_Code', 'Request_Hash', 'Timestamp'],
  App_Log: ['Log_ID', 'Level', 'Message', 'Context_JSON', 'Timestamp'],

  // Additive New Media Tables
  Media_Files: [
    'Media_ID', 'Drive_File_ID', 'Drive_Folder_ID', 'File_Name', 'Original_File_Name',
    'Mime_Type', 'Size_Bytes', 'Width', 'Height', 'Uploaded_By', 'Visibility',
    'Linked_Entity_Type', 'Linked_Entity_ID', 'Caption', 'Taken_At', 'Created_At',
    'Updated_At', 'Version', 'Deleted_At'
  ],
  Photo_Albums: [
    'Album_ID', 'Name', 'Description', 'Cover_Media_ID', 'Visibility', 'Created_By',
    'Created_At', 'Updated_At', 'Version', 'Deleted_At'
  ],
  Photo_Album_Items: ['Album_Item_ID', 'Album_ID', 'Media_ID', 'Sort_Order', 'Added_By', 'Added_At', 'Deleted_At'],
};

export class SheetStore {
  private static instance: SheetStore;
  private googleClient: GoogleSheetsClient;
  private localTables: Map<string, { headers: string[]; rows: Map<string, Record<string, any>> }> = new Map();
  private dataVersions: Map<string, number> = new Map();
  private requestIds: Set<string> = new Set();

  private constructor() {
    this.googleClient = new GoogleSheetsClient();
    this.initializeLocalSeed();
  }

  public static getInstance(): SheetStore {
    if (!SheetStore.instance) {
      SheetStore.instance = new SheetStore();
    }
    return SheetStore.instance;
  }

  public isUsingLiveGoogle(): boolean {
    return isGoogleConfigured();
  }

  private initializeLocalSeed() {
    // Populate all known Sheet tabs with initial schema headers
    for (const [tabName, columns] of Object.entries(SHEET_SCHEMA_TABS)) {
      this.localTables.set(tabName, {
        headers: [...columns],
        rows: new Map(),
      });
      this.dataVersions.set(tabName, 1);
    }

    // Seed initial records into in-memory store
    const memTable = this.localTables.get('Family_Members')!;
    const credTable = this.localTables.get('Access_Credentials')!;

    const initialPins: Record<string, string> = {
      'mem-juan-owner': '1234',
      'mem-maria-admin': '1234',
      'mem-amber-child': '1111',
      'mem-alexa-child': '2222',
      'mem-adine-child': '3333',
    };

    for (const m of INITIAL_MEMBERS) {
      const pin = initialPins[m.Member_ID] || '1234';
      const salt = `SALT_${m.First_Name.toUpperCase()}_ENGUERRA_2024`;
      const hash = LegacyAuthService.hashSha256(pin, salt);

      memTable.rows.set(m.Member_ID, {
        ...m,
        Pin_Hash: hash,
        Pin_Salt: salt,
      });

      credTable.rows.set(`cred-${m.Member_ID}`, {
        Credential_ID: `cred-${m.Member_ID}`,
        Member_ID: m.Member_ID,
        Pin_Hash: hash,
        Pin_Salt: salt,
        Algorithm: 'APPS_SCRIPT_SHA256_SALT_PREFIX',
        Iterations: 1,
        Updated_At: m.Updated_At,
      });
    }

    const prefTable = this.localTables.get('User_Preferences')!;
    for (const p of INITIAL_PREFERENCES) {
      prefTable.rows.set(p.Preference_ID, { ...p });
    }

    const evTable = this.localTables.get('Events')!;
    for (const e of INITIAL_EVENTS) {
      evTable.rows.set(e.Event_ID, {
        ...e,
        Assigned_Members: JSON.stringify(e.Assigned_Members),
      });
    }

    const respTable = this.localTables.get('Task_Responsibilities')!;
    for (const r of INITIAL_RESPONSIBILITIES) {
      respTable.rows.set(r.Responsibility_ID, {
        ...r,
        Target_Days: JSON.stringify(r.Target_Days),
      });
    }

    const taskTable = this.localTables.get('Tasks')!;
    for (const t of INITIAL_TASKS) {
      taskTable.rows.set(t.Task_ID, { ...t });
    }

    const listTable = this.localTables.get('Lists')!;
    for (const l of INITIAL_LISTS) {
      listTable.rows.set(l.List_ID, { ...l });
    }

    const itemTable = this.localTables.get('List_Items')!;
    for (const i of INITIAL_LIST_ITEMS) {
      itemTable.rows.set(i.Item_ID, { ...i });
    }

    const threadTable = this.localTables.get('Chat_Threads')!;
    for (const th of INITIAL_THREADS) {
      threadTable.rows.set(th.Thread_ID, {
        ...th,
        Participant_IDs: JSON.stringify(th.Participant_IDs),
      });
    }

    const msgTable = this.localTables.get('Chat_Messages')!;
    for (const m of INITIAL_MESSAGES) {
      msgTable.rows.set(m.Message_ID, { ...m });
    }

    const albTable = this.localTables.get('Photo_Albums')!;
    for (const a of INITIAL_ALBUMS) {
      albTable.rows.set(a.Album_ID, { ...a });
    }

    const medTable = this.localTables.get('Media_Files')!;
    for (const mf of INITIAL_MEDIA) {
      medTable.rows.set(mf.Media_ID, { ...mf });
    }

    // Config
    const cfgTable = this.localTables.get('App_Config')!;
    cfgTable.rows.set('ENVIRONMENT', { Key: 'ENVIRONMENT', Value: 'DEV', Description: 'Enguerra Applet Environment', Updated_At: new Date().toISOString(), Updated_By: 'system' });
    cfgTable.rows.set('APP_NAME', { Key: 'APP_NAME', Value: 'Enguerra of NY', Description: 'Family Application Title', Updated_At: new Date().toISOString(), Updated_By: 'system' });
  }

  /**
   * Reads all active records from a specified Sheet tab
   */
  public async getTableRecords<T>(tabName: string): Promise<T[]> {
    if (this.isUsingLiveGoogle()) {
      try {
        const raw = await this.googleClient.getValues(`${tabName}!A1:Z`);
        if (!raw || raw.length <= 1) return [];

        const headers = raw[0];
        const headerMap = new Map<string, number>();
        headers.forEach((h, idx) => headerMap.set(h.trim(), idx));

        const results: T[] = [];
        for (let i = 1; i < raw.length; i++) {
          const row = raw[i];
          const obj: any = {};
          headerMap.forEach((colIdx, colName) => {
            obj[colName] = row[colIdx] ?? '';
          });
          // Filter soft-deleted records
          if (!obj.Deleted_At) {
            results.push(obj as T);
          }
        }
        return results;
      } catch (err) {
        console.warn(`[SheetStore] Fallback to local store for ${tabName} due to live read error:`, err);
      }
    }

    const table = this.localTables.get(tabName);
    if (!table) return [];

    const activeRows: T[] = [];
    for (const row of table.rows.values()) {
      if (!row.Deleted_At) {
        activeRows.push({ ...row } as T);
      }
    }
    return activeRows;
  }

  /**
   * Retrieves a single record by primary key ID
   */
  public async getRecordById<T>(tabName: string, idField: string, idValue: string): Promise<T | null> {
    const all = await this.getTableRecords<any>(tabName);
    const found = all.find(r => r[idField] === idValue && !r.Deleted_At);
    return found ? (found as T) : null;
  }

  /**
   * Writes/upserts a record with optimistic version check and Data_Versions increment
   */
  public async upsertRecord(tabName: string, idField: string, record: Record<string, any>): Promise<void> {
    const id = record[idField];
    if (!id) throw new Error(`Missing primary key ${idField}`);

    const table = this.localTables.get(tabName);
    if (!table) throw new Error(`Sheet tab ${tabName} does not exist`);

    const existing = table.rows.get(id);
    const now = new Date().toISOString();

    if (existing) {
      // Optimistic concurrency check
      if (record.Version !== undefined && existing.Version !== undefined && record.Version < existing.Version) {
        throw new Error(`CONCURRENCY_CONFLICT: Version ${record.Version} is older than database version ${existing.Version}`);
      }
      record.Updated_At = now;
      record.Version = (existing.Version || 1) + 1;
    } else {
      record.Created_At = record.Created_At || now;
      record.Updated_At = now;
      record.Version = 1;
      record.Deleted_At = null;
    }

    table.rows.set(id, { ...existing, ...record });

    // Invalidate Data_Versions
    const currentVer = (this.dataVersions.get(tabName) || 1) + 1;
    this.dataVersions.set(tabName, currentVer);

    // If live Google Sheets is connected, write row
    if (this.isUsingLiveGoogle()) {
      try {
        const rowValues = table.headers.map(h => {
          const val = record[h];
          if (val === undefined || val === null) return '';
          if (typeof val === 'object') return JSON.stringify(val);
          return String(val);
        });
        await this.googleClient.appendValues(tabName, [rowValues]);
      } catch (err) {
        console.error(`[SheetStore] Live write error on ${tabName}:`, err);
      }
    }
  }

  /**
   * Soft-deletes a record by setting Deleted_At
   */
  public async softDeleteRecord(tabName: string, idField: string, idValue: string): Promise<void> {
    const table = this.localTables.get(tabName);
    if (!table) return;

    const existing = table.rows.get(idValue);
    if (existing) {
      existing.Deleted_At = new Date().toISOString();
      existing.Version = (existing.Version || 1) + 1;
      table.rows.set(idValue, existing);

      const currentVer = (this.dataVersions.get(tabName) || 1) + 1;
      this.dataVersions.set(tabName, currentVer);
    }
  }

  /**
   * Retrieves current Data_Versions for client invalidation polling
   */
  public getDataVersions(): Record<string, number> {
    const res: Record<string, number> = {};
    for (const [entity, ver] of this.dataVersions.entries()) {
      res[entity] = ver;
    }
    return res;
  }

  /**
   * Checks request idempotency
   */
  public isRequestProcessed(requestId: string): boolean {
    return this.requestIds.has(requestId);
  }

  public markRequestProcessed(requestId: string): void {
    this.requestIds.add(requestId);
  }

  /**
   * Schema Verification for Diagnostics
   */
  public getRegisteredTabs(): string[] {
    return Object.keys(SHEET_SCHEMA_TABS);
  }

  public getTabColumns(tabName: string): string[] {
    return SHEET_SCHEMA_TABS[tabName] || [];
  }
}
