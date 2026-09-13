/**
 * Enguerra of NY - Google Sheets Service Module
 *
 * Dedicated service module for interacting with the Google Sheets API to fetch
 * family member profiles, tasks, and task lists as defined in the .env configuration.
 *
 * Capabilities:
 * - Reads spreadsheet ID and tab definitions from environment variables (.env)
 * - Directly accesses the Google Sheets v4 REST API using OAuth 2.0 / Service Account
 * - Maps raw tabular rows to strongly-typed FamilyMember, TaskItem, and FamilyList entities
 * - Supports batch reading for high-performance multi-range requests
 * - Provides graceful fallback to local authoritative store during preview/offline modes
 */

import { GoogleSheetsClient } from '../google/sheets';
import { isGoogleConfigured, getGoogleConfig } from '../google/auth';
import { SheetStore } from '../storage/sheetStore';
import {
  FamilyMember,
  TaskItem,
  FamilyList,
  TaskResponsibility,
  FamilyRole,
  TaskStatus,
  EntityVisibility
} from '../../src/types';

export interface GoogleSheetsServiceConfig {
  spreadsheetId: string;
  membersTab: string;
  tasksTab: string;
  listsTab: string;
  responsibilitiesTab: string;
  isConfigured: boolean;
}

export interface SheetsFetchOptions {
  /** If true, forces direct Google Sheets API fetch, throwing if unavailable */
  forceLive?: boolean;
  /** Filter tasks by assigned member */
  memberId?: string;
  /** Include deleted records */
  includeDeleted?: boolean;
}

export class GoogleSheetsService {
  private static instance: GoogleSheetsService;
  private client: GoogleSheetsClient;
  private localStore = SheetStore.getInstance();

  constructor() {
    const sheetId = process.env.ENGUERRA_SHEET_ID ||
      process.env.GOOGLE_SHEETS_SPREADSHEET_ID ||
      process.env.SHEET_ID ||
      '';
    this.client = new GoogleSheetsClient(sheetId);
  }

  public static getInstance(): GoogleSheetsService {
    if (!GoogleSheetsService.instance) {
      GoogleSheetsService.instance = new GoogleSheetsService();
    }
    return GoogleSheetsService.instance;
  }

  /**
   * Retrieves active configuration read from .env
   */
  public getConfig(): GoogleSheetsServiceConfig {
    const spreadsheetId = process.env.ENGUERRA_SHEET_ID ||
      process.env.GOOGLE_SHEETS_SPREADSHEET_ID ||
      process.env.SHEET_ID ||
      '';

    return {
      spreadsheetId,
      membersTab: process.env.SHEET_TAB_FAMILY_MEMBERS || 'Family_Members',
      tasksTab: process.env.SHEET_TAB_TASKS || 'Tasks',
      listsTab: process.env.SHEET_TAB_LISTS || 'Lists',
      responsibilitiesTab: process.env.SHEET_TAB_TASK_RESPONSIBILITIES || 'Task_Responsibilities',
      isConfigured: isGoogleConfigured() && Boolean(spreadsheetId),
    };
  }

  /**
   * Verifies Google Sheets connectivity and returns spreadsheet metadata
   */
  public async checkConnection(): Promise<{
    configured: boolean;
    spreadsheetId: string;
    liveConnected: boolean;
    title?: string;
    sheets?: string[];
    error?: string;
  }> {
    const config = this.getConfig();

    if (!config.isConfigured) {
      return {
        configured: false,
        spreadsheetId: config.spreadsheetId,
        liveConnected: false,
        error: 'Google OAuth credentials or spreadsheet ID not fully configured in environment',
      };
    }

    try {
      const metadata = await this.client.getMetadata();
      return {
        configured: true,
        spreadsheetId: config.spreadsheetId,
        liveConnected: true,
        title: metadata.title,
        sheets: metadata.sheets,
      };
    } catch (err: any) {
      console.warn('[GoogleSheetsService] Live connection check failed:', err.message);
      return {
        configured: true,
        spreadsheetId: config.spreadsheetId,
        liveConnected: false,
        error: err.message || 'Failed to fetch spreadsheet metadata',
      };
    }
  }

  /**
   * Fetches family member profiles from Google Sheets
   *
   * Target Tab: Family_Members (or configured via SHEET_TAB_FAMILY_MEMBERS in .env)
   */
  public async fetchFamilyMembers(options: SheetsFetchOptions = {}): Promise<FamilyMember[]> {
    const config = this.getConfig();

    // If Google credentials are live and configured, fetch directly from Google Sheets API
    if (config.isConfigured) {
      try {
        const range = `${config.membersTab}!A1:Z`;
        const rows = await this.client.getValues(range);

        if (rows && rows.length > 1) {
          const headers = rows[0].map(h => (h || '').trim());
          const headerMap = new Map<string, number>();
          headers.forEach((h, idx) => headerMap.set(h.toLowerCase(), idx));

          const members: FamilyMember[] = [];

          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const member = this.parseFamilyMemberRow(row, headerMap);
            if (!member) continue;

            if (!options.includeDeleted && member.Deleted_At) {
              continue;
            }

            members.push(member);
          }

          console.log(`[GoogleSheetsService] Successfully fetched ${members.length} family profiles from Google Sheet tab "${config.membersTab}"`);
          return members;
        }
      } catch (err: any) {
        console.warn(`[GoogleSheetsService] Failed to read ${config.membersTab} from live Google Sheets:`, err.message);
        if (options.forceLive) {
          throw new Error(`Failed to fetch family members from Google Sheets API: ${err.message}`);
        }
      }
    }

    // Fallback to local store
    console.log('[GoogleSheetsService] Utilizing local store for family member profiles');
    const localRecords = await this.localStore.getTableRecords<any>('Family_Members');
    return localRecords
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
      .filter(m => (options.includeDeleted ? true : !m.Deleted_At));
  }

  /**
   * Fetches a single family member by ID
   */
  public async fetchFamilyMemberById(memberId: string): Promise<FamilyMember | null> {
    const all = await this.fetchFamilyMembers({ includeDeleted: true });
    return all.find(m => m.Member_ID === memberId) || null;
  }

  /**
   * Fetches tasks from Google Sheets
   *
   * Target Tab: Tasks (or configured via SHEET_TAB_TASKS in .env)
   */
  public async fetchTasks(options: SheetsFetchOptions = {}): Promise<TaskItem[]> {
    const config = this.getConfig();

    if (config.isConfigured) {
      try {
        const range = `${config.tasksTab}!A1:Z`;
        const rows = await this.client.getValues(range);

        if (rows && rows.length > 1) {
          const headers = rows[0].map(h => (h || '').trim());
          const headerMap = new Map<string, number>();
          headers.forEach((h, idx) => headerMap.set(h.toLowerCase(), idx));

          const tasks: TaskItem[] = [];

          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const task = this.parseTaskRow(row, headerMap);
            if (!task) continue;

            if (!options.includeDeleted && task.Deleted_At) {
              continue;
            }

            if (options.memberId && task.Assigned_To !== options.memberId && task.Created_By !== options.memberId) {
              continue;
            }

            tasks.push(task);
          }

          console.log(`[GoogleSheetsService] Successfully fetched ${tasks.length} tasks from Google Sheet tab "${config.tasksTab}"`);
          return tasks;
        }
      } catch (err: any) {
        console.warn(`[GoogleSheetsService] Failed to read ${config.tasksTab} from live Google Sheets:`, err.message);
        if (options.forceLive) {
          throw new Error(`Failed to fetch tasks from Google Sheets API: ${err.message}`);
        }
      }
    }

    // Local store fallback
    const raw = await this.localStore.getTableRecords<any>('Tasks');
    return raw
      .map(r => ({
        Task_ID: r.Task_ID,
        Title: r.Title,
        Description: r.Description || '',
        Due_Date: r.Due_Date,
        Assigned_To: r.Assigned_To,
        Status: (r.Status || 'PENDING') as TaskStatus,
        Priority: r.Priority || 'MEDIUM',
        Visibility: (r.Visibility || 'FAMILY') as EntityVisibility,
        Category: r.Category || 'CHORE',
        Points: Number(r.Points) || 0,
        Approved_By: r.Approved_By || null,
        Created_By: r.Created_By,
        Created_At: r.Created_At,
        Updated_At: r.Updated_At,
        Version: Number(r.Version) || 1,
        Deleted_At: r.Deleted_At || null,
      }))
      .filter(t => {
        if (!options.includeDeleted && t.Deleted_At) return false;
        if (options.memberId && t.Assigned_To !== options.memberId && t.Created_By !== options.memberId) {
          return false;
        }
        return true;
      });
  }

  /**
   * Fetches task lists from Google Sheets
   *
   * Target Tab: Lists (or configured via SHEET_TAB_LISTS in .env)
   */
  public async fetchTaskLists(options: SheetsFetchOptions = {}): Promise<FamilyList[]> {
    const config = this.getConfig();

    if (config.isConfigured) {
      try {
        const range = `${config.listsTab}!A1:Z`;
        const rows = await this.client.getValues(range);

        if (rows && rows.length > 1) {
          const headers = rows[0].map(h => (h || '').trim());
          const headerMap = new Map<string, number>();
          headers.forEach((h, idx) => headerMap.set(h.toLowerCase(), idx));

          const lists: FamilyList[] = [];

          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const list = this.parseListRow(row, headerMap);
            if (!list) continue;

            if (!options.includeDeleted && list.Deleted_At) {
              continue;
            }

            lists.push(list);
          }

          console.log(`[GoogleSheetsService] Successfully fetched ${lists.length} task lists from Google Sheet tab "${config.listsTab}"`);
          return lists;
        }
      } catch (err: any) {
        console.warn(`[GoogleSheetsService] Failed to read ${config.listsTab} from live Google Sheets:`, err.message);
        if (options.forceLive) {
          throw new Error(`Failed to fetch lists from Google Sheets API: ${err.message}`);
        }
      }
    }

    // Local fallback
    const raw = await this.localStore.getTableRecords<any>('Lists');
    return raw
      .map(r => ({
        List_ID: r.List_ID,
        Title: r.Title,
        Category: r.Category || 'GENERAL',
        Icon: r.Icon,
        Visibility: (r.Visibility || 'FAMILY') as EntityVisibility,
        Created_By: r.Created_By,
        Created_At: r.Created_At,
        Updated_At: r.Updated_At,
        Version: Number(r.Version) || 1,
        Deleted_At: r.Deleted_At || null,
      }))
      .filter(l => (options.includeDeleted ? true : !l.Deleted_At));
  }

  /**
   * Fetches recurring task responsibilities from Google Sheets
   *
   * Target Tab: Task_Responsibilities (or configured via SHEET_TAB_TASK_RESPONSIBILITIES in .env)
   */
  public async fetchTaskResponsibilities(options: SheetsFetchOptions = {}): Promise<TaskResponsibility[]> {
    const config = this.getConfig();

    if (config.isConfigured) {
      try {
        const range = `${config.responsibilitiesTab}!A1:Z`;
        const rows = await this.client.getValues(range);

        if (rows && rows.length > 1) {
          const headers = rows[0].map(h => (h || '').trim());
          const headerMap = new Map<string, number>();
          headers.forEach((h, idx) => headerMap.set(h.toLowerCase(), idx));

          const responsibilities: TaskResponsibility[] = [];

          for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const resp = this.parseResponsibilityRow(row, headerMap);
            if (!resp) continue;

            if (!options.includeDeleted && resp.Deleted_At) {
              continue;
            }

            if (options.memberId && resp.Assigned_To !== options.memberId) {
              continue;
            }

            responsibilities.push(resp);
          }

          return responsibilities;
        }
      } catch (err: any) {
        console.warn(`[GoogleSheetsService] Failed to read ${config.responsibilitiesTab} from live Google Sheets:`, err.message);
        if (options.forceLive) {
          throw new Error(`Failed to fetch responsibilities from Google Sheets API: ${err.message}`);
        }
      }
    }

    // Local fallback
    const raw = await this.localStore.getTableRecords<any>('Task_Responsibilities');
    return raw
      .map(r => {
        let days: string[] = [];
        try {
          days = typeof r.Target_Days === 'string' && r.Target_Days.startsWith('[')
            ? JSON.parse(r.Target_Days)
            : (r.Target_Days ? [r.Target_Days] : []);
        } catch {
          days = [];
        }

        return {
          Responsibility_ID: r.Responsibility_ID,
          Title: r.Title,
          Category: r.Category || 'CHORE',
          Recurrence: r.Recurrence || 'DAILY',
          Assigned_To: r.Assigned_To,
          Target_Days: days,
          Points: Number(r.Points) || 0,
          Active: String(r.Active) !== 'false',
          Created_At: r.Created_At,
          Updated_At: r.Updated_At,
          Version: Number(r.Version) || 1,
          Deleted_At: r.Deleted_At || null,
        };
      })
      .filter(r => {
        if (!options.includeDeleted && r.Deleted_At) return false;
        if (options.memberId && r.Assigned_To !== options.memberId) return false;
        return true;
      });
  }

  /**
   * High-performance batch query for all task modules in one operation
   */
  public async fetchAllTaskModules(options: SheetsFetchOptions = {}): Promise<{
    tasks: TaskItem[];
    lists: FamilyList[];
    responsibilities: TaskResponsibility[];
  }> {
    const config = this.getConfig();

    if (config.isConfigured) {
      try {
        const ranges = [
          `${config.tasksTab}!A1:Z`,
          `${config.listsTab}!A1:Z`,
          `${config.responsibilitiesTab}!A1:Z`,
        ];

        const batchMap = await this.client.batchGetValues(ranges);

        const tasksRows = this.findRangeData(batchMap, config.tasksTab);
        const listsRows = this.findRangeData(batchMap, config.listsTab);
        const respRows = this.findRangeData(batchMap, config.responsibilitiesTab);

        const tasks = this.parseBatchRows(tasksRows, (row, map) => this.parseTaskRow(row, map), options);
        const lists = this.parseBatchRows(listsRows, (row, map) => this.parseListRow(row, map), options);
        const responsibilities = this.parseBatchRows(respRows, (row, map) => this.parseResponsibilityRow(row, map), options);

        return { tasks, lists, responsibilities };
      } catch (err: any) {
        console.warn('[GoogleSheetsService] Batch task fetch failed, falling back to individual calls:', err.message);
      }
    }

    const [tasks, lists, responsibilities] = await Promise.all([
      this.fetchTasks(options),
      this.fetchTaskLists(options),
      this.fetchTaskResponsibilities(options),
    ]);

    return { tasks, lists, responsibilities };
  }

  // ============================================================================
  // Private Row Parsing Helpers
  // ============================================================================

  private getCol(row: string[], headerMap: Map<string, number>, key: string): string {
    const idx = headerMap.get(key.toLowerCase());
    if (idx === undefined || idx >= row.length) return '';
    return (row[idx] ?? '').toString().trim();
  }

  private parseFamilyMemberRow(row: string[], headerMap: Map<string, number>): FamilyMember | null {
    const memberId = this.getCol(row, headerMap, 'Member_ID');
    if (!memberId) return null;

    return {
      Member_ID: memberId,
      First_Name: this.getCol(row, headerMap, 'First_Name'),
      Last_Name: this.getCol(row, headerMap, 'Last_Name'),
      Display_Name: this.getCol(row, headerMap, 'Display_Name') || this.getCol(row, headerMap, 'First_Name'),
      Role: (this.getCol(row, headerMap, 'Role') || 'CHILD') as FamilyRole,
      Birth_Date: this.getCol(row, headerMap, 'Birth_Date'),
      Color: this.getCol(row, headerMap, 'Color') || '#0284C7',
      Avatar_Key: this.getCol(row, headerMap, 'Avatar_Key') || undefined,
      Avatar_URL: this.getCol(row, headerMap, 'Avatar_URL') || undefined,
      Avatar_Media_ID: this.getCol(row, headerMap, 'Avatar_Media_ID') || undefined,
      Status: (this.getCol(row, headerMap, 'Status') || 'ACTIVE') as 'ACTIVE' | 'INACTIVE',
      Created_At: this.getCol(row, headerMap, 'Created_At') || new Date().toISOString(),
      Updated_At: this.getCol(row, headerMap, 'Updated_At') || new Date().toISOString(),
      Version: parseInt(this.getCol(row, headerMap, 'Version'), 10) || 1,
      Deleted_At: this.getCol(row, headerMap, 'Deleted_At') || null,
    };
  }

  private parseTaskRow(row: string[], headerMap: Map<string, number>): TaskItem | null {
    const taskId = this.getCol(row, headerMap, 'Task_ID');
    if (!taskId) return null;

    return {
      Task_ID: taskId,
      Title: this.getCol(row, headerMap, 'Title') || 'Untitled Task',
      Description: this.getCol(row, headerMap, 'Description'),
      Due_Date: this.getCol(row, headerMap, 'Due_Date') || new Date().toISOString().split('T')[0],
      Assigned_To: this.getCol(row, headerMap, 'Assigned_To'),
      Status: (this.getCol(row, headerMap, 'Status') || 'PENDING') as TaskStatus,
      Priority: (this.getCol(row, headerMap, 'Priority') || 'MEDIUM') as 'LOW' | 'MEDIUM' | 'HIGH',
      Visibility: (this.getCol(row, headerMap, 'Visibility') || 'FAMILY') as EntityVisibility,
      Category: (this.getCol(row, headerMap, 'Category') || 'CHORE') as any,
      Points: parseInt(this.getCol(row, headerMap, 'Points'), 10) || 0,
      Approved_By: this.getCol(row, headerMap, 'Approved_By') || null,
      Created_By: this.getCol(row, headerMap, 'Created_By') || 'system',
      Created_At: this.getCol(row, headerMap, 'Created_At') || new Date().toISOString(),
      Updated_At: this.getCol(row, headerMap, 'Updated_At') || new Date().toISOString(),
      Version: parseInt(this.getCol(row, headerMap, 'Version'), 10) || 1,
      Deleted_At: this.getCol(row, headerMap, 'Deleted_At') || null,
    };
  }

  private parseListRow(row: string[], headerMap: Map<string, number>): FamilyList | null {
    const listId = this.getCol(row, headerMap, 'List_ID');
    if (!listId) return null;

    return {
      List_ID: listId,
      Title: this.getCol(row, headerMap, 'Title') || 'Untitled List',
      Category: (this.getCol(row, headerMap, 'Category') || 'GENERAL') as any,
      Icon: this.getCol(row, headerMap, 'Icon') || undefined,
      Visibility: (this.getCol(row, headerMap, 'Visibility') || 'FAMILY') as EntityVisibility,
      Created_By: this.getCol(row, headerMap, 'Created_By') || 'system',
      Created_At: this.getCol(row, headerMap, 'Created_At') || new Date().toISOString(),
      Updated_At: this.getCol(row, headerMap, 'Updated_At') || new Date().toISOString(),
      Version: parseInt(this.getCol(row, headerMap, 'Version'), 10) || 1,
      Deleted_At: this.getCol(row, headerMap, 'Deleted_At') || null,
    };
  }

  private parseResponsibilityRow(row: string[], headerMap: Map<string, number>): TaskResponsibility | null {
    const respId = this.getCol(row, headerMap, 'Responsibility_ID');
    if (!respId) return null;

    let days: string[] = [];
    const targetDaysRaw = this.getCol(row, headerMap, 'Target_Days');
    try {
      days = targetDaysRaw.startsWith('[') ? JSON.parse(targetDaysRaw) : (targetDaysRaw ? [targetDaysRaw] : []);
    } catch {
      days = [];
    }

    return {
      Responsibility_ID: respId,
      Title: this.getCol(row, headerMap, 'Title') || 'Responsibility',
      Category: this.getCol(row, headerMap, 'Category') || 'CHORE',
      Recurrence: (this.getCol(row, headerMap, 'Recurrence') || 'DAILY') as any,
      Assigned_To: this.getCol(row, headerMap, 'Assigned_To'),
      Target_Days: days,
      Points: parseInt(this.getCol(row, headerMap, 'Points'), 10) || 0,
      Active: this.getCol(row, headerMap, 'Active').toLowerCase() !== 'false',
      Created_At: this.getCol(row, headerMap, 'Created_At') || new Date().toISOString(),
      Updated_At: this.getCol(row, headerMap, 'Updated_At') || new Date().toISOString(),
      Version: parseInt(this.getCol(row, headerMap, 'Version'), 10) || 1,
      Deleted_At: this.getCol(row, headerMap, 'Deleted_At') || null,
    };
  }

  private findRangeData(batchMap: Map<string, string[][]>, tabName: string): string[][] {
    for (const [key, val] of batchMap.entries()) {
      if (key.includes(tabName)) return val;
    }
    return [];
  }

  private parseBatchRows<T extends { Deleted_At?: string | null }>(
    rows: string[][],
    parser: (row: string[], map: Map<string, number>) => T | null,
    options: SheetsFetchOptions
  ): T[] {
    if (!rows || rows.length <= 1) return [];

    const headers = rows[0].map(h => (h || '').trim());
    const headerMap = new Map<string, number>();
    headers.forEach((h, idx) => headerMap.set(h.toLowerCase(), idx));

    const results: T[] = [];
    for (let i = 1; i < rows.length; i++) {
      const item = parser(rows[i], headerMap);
      if (!item) continue;
      if (!options.includeDeleted && item.Deleted_At) continue;
      results.push(item);
    }
    return results;
  }
}
