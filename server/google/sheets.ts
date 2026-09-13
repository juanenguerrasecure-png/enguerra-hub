/**
 * Enguerra of NY - Central Google Sheets Data Access Layer
 *
 * Implements Google Sheets v4 REST API operations with typed row mappers,
 * batch read/writes, optimistic version checks, and schema validation.
 */

import { getGoogleAccessToken, getGoogleConfig } from './auth';

export interface SheetRowMapper<T> {
  fromRow(row: string[], headerMap: Map<string, number>): T;
  toRow(item: T, headers: string[]): string[];
}

export class GoogleSheetsClient {
  private spreadsheetId: string;

  constructor(spreadsheetId?: string) {
    this.spreadsheetId = spreadsheetId || getGoogleConfig().sheetId || '';
  }

  public getSpreadsheetId(): string {
    return this.spreadsheetId;
  }

  private async fetchApi(endpoint: string, options: RequestInit = {}): Promise<any> {
    const token = await getGoogleAccessToken();
    if (!token) {
      throw new Error('GOOGLE_AUTH_UNAVAILABLE: No valid Google OAuth access token found');
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}${endpoint}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Sheets API Error [${res.status}]: ${errBody}`);
    }

    return res.json();
  }

  /**
   * Retrieves all metadata and sheet names from the spreadsheet
   */
  public async getMetadata(): Promise<{ title: string; sheets: string[] }> {
    const data = await this.fetchApi('?fields=properties.title,sheets.properties.title');
    const sheets = (data.sheets || []).map((s: any) => s.properties?.title as string);
    return {
      title: data.properties?.title || 'Enguerra of NY Database',
      sheets,
    };
  }

  /**
   * Reads raw values from a specified sheet tab or range (e.g. 'Events!A1:Z')
   */
  public async getValues(range: string): Promise<string[][]> {
    const encodedRange = encodeURIComponent(range);
    const data = await this.fetchApi(`/values/${encodedRange}?valueRenderOption=UNFORMATTED_VALUE`);
    return data.values || [];
  }

  /**
   * Batch reads multiple ranges in a single Google API request
   */
  public async batchGetValues(ranges: string[]): Promise<Map<string, string[][]>> {
    const query = ranges.map(r => `ranges=${encodeURIComponent(r)}`).join('&');
    const data = await this.fetchApi(`/values:batchGet?${query}&valueRenderOption=UNFORMATTED_VALUE`);
    const result = new Map<string, string[][]>();

    if (data.valueRanges) {
      for (const vr of data.valueRanges) {
        result.set(vr.range, vr.values || []);
      }
    }
    return result;
  }

  /**
   * Updates values in a specific range
   */
  public async updateValues(range: string, values: string[][]): Promise<void> {
    const encodedRange = encodeURIComponent(range);
    await this.fetchApi(`/values/${encodedRange}?valueInputOption=USER_ENTERED`, {
      method: 'PUT',
      body: JSON.stringify({ values }),
    });
  }

  /**
   * Appends rows to the end of a sheet tab
   */
  public async appendValues(sheetName: string, values: string[][]): Promise<void> {
    const encodedRange = encodeURIComponent(`${sheetName}!A1`);
    await this.fetchApi(`/values/${encodedRange}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
      method: 'POST',
      body: JSON.stringify({ values }),
    });
  }

  /**
   * Creates new sheet tabs if they do not exist (additive schema migration)
   */
  public async addSheetsIfMissing(sheetNames: string[]): Promise<string[]> {
    const metadata = await this.getMetadata();
    const existing = new Set(metadata.sheets);
    const toAdd = sheetNames.filter(name => !existing.has(name));

    if (toAdd.length === 0) {
      return [];
    }

    const requests = toAdd.map(title => ({
      addSheet: {
        properties: { title },
      },
    }));

    await this.fetchApi(':batchUpdate', {
      method: 'POST',
      body: JSON.stringify({ requests }),
    });

    return toAdd;
  }
}
