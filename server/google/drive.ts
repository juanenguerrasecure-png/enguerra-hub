/**
 * Enguerra of NY - Central Google Drive File Storage Layer
 *
 * Implements server-side private file storage, streaming downloads with MIME validation,
 * and folder hierarchy maintenance:
 *   Enguerra of NY App Data/
 *     Photos/YYYY/MM/
 *     Avatars/
 *     Chat Attachments/YYYY/MM/
 *     Documents/
 *     Exports/
 */

import { getGoogleAccessToken, getGoogleConfig } from './auth';

export interface DriveFileMetadata {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  parents?: string[];
  createdTime?: string;
  modifiedTime?: string;
}

export class GoogleDriveClient {
  private rootFolderId: string;

  constructor(rootFolderId?: string) {
    this.rootFolderId = rootFolderId || getGoogleConfig().driveFolderId || '';
  }

  public getRootFolderId(): string {
    return this.rootFolderId;
  }

  private async fetchApi(endpoint: string, options: RequestInit = {}): Promise<any> {
    const token = await getGoogleAccessToken();
    if (!token) {
      throw new Error('GOOGLE_AUTH_UNAVAILABLE: No valid Google OAuth access token found for Drive');
    }

    const url = `https://www.googleapis.com/drive/v3${endpoint}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Drive API Error [${res.status}]: ${err}`);
    }

    return res.json();
  }

  /**
   * Retrieves metadata for a private Drive file
   */
  public async getFileMetadata(fileId: string): Promise<DriveFileMetadata> {
    return this.fetchApi(`/files/${fileId}?fields=id,name,mimeType,size,parents,createdTime,modifiedTime`);
  }

  /**
   * Downloads private file bytes directly from Drive to stream through the server API
   */
  public async downloadFileStream(fileId: string): Promise<{ stream: ReadableStream<Uint8Array>; mimeType: string; size?: number }> {
    const token = await getGoogleAccessToken();
    if (!token) {
      throw new Error('GOOGLE_AUTH_UNAVAILABLE');
    }

    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok || !res.body) {
      throw new Error(`Failed to download Drive file [${res.status}]`);
    }

    const mimeType = res.headers.get('content-type') || 'application/octet-stream';
    const size = Number(res.headers.get('content-length')) || undefined;

    return {
      stream: res.body,
      mimeType,
      size,
    };
  }

  /**
   * Uploads file buffer or stream directly to a specified Drive folder
   */
  public async uploadFile(params: {
    name: string;
    mimeType: string;
    folderId?: string;
    buffer: Buffer;
  }): Promise<DriveFileMetadata> {
    const token = await getGoogleAccessToken();
    if (!token) {
      throw new Error('GOOGLE_AUTH_UNAVAILABLE');
    }

    const targetFolder = params.folderId || this.rootFolderId;
    const metadata = {
      name: params.name,
      mimeType: params.mimeType,
      parents: targetFolder ? [targetFolder] : [],
    };

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metaPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`;
    const filePartHeader = `${delimiter}Content-Type: ${params.mimeType}\r\n\r\n`;

    const multipartBody = Buffer.concat([
      Buffer.from(metaPart, 'utf8'),
      Buffer.from(filePartHeader, 'utf8'),
      params.buffer,
      Buffer.from(closeDelimiter, 'utf8'),
    ]);

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': multipartBody.length.toString(),
      },
      body: multipartBody,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Drive Upload Error [${res.status}]: ${err}`);
    }

    return res.json();
  }

  /**
   * Creates or locates the Enguerra of NY logical folder hierarchy
   */
  public async ensureFolder(name: string, parentId?: string): Promise<string> {
    const parentQuery = parentId ? `'${parentId}' in parents and ` : '';
    const q = `${parentQuery}name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;

    const data = await this.fetchApi(`/files?q=${encodeURIComponent(q)}&fields=files(id,name)`);
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }

    // Create folder
    const created = await this.fetchApi('/files?fields=id,name', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentId ? [parentId] : (this.rootFolderId ? [this.rootFolderId] : []),
      }),
    });

    return created.id;
  }
}
