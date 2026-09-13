import { MediaFile, PhotoAlbum } from '../../src/types';
import { MediaRepository } from '../repositories/mediaRepository';
import { GoogleDriveClient } from '../google/drive';
import { isGoogleConfigured } from '../google/auth';
import { AuditRepository } from '../repositories/auditRepository';

export class MediaService {
  private mediaRepo = new MediaRepository();
  private driveClient = new GoogleDriveClient();
  private auditRepo = new AuditRepository();

  private ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'text/plain',
  ]);
  private MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

  public async getMediaList(memberRole: string, memberId: string, isHubLocked: boolean = false): Promise<MediaFile[]> {
    return this.mediaRepo.getMediaFiles(memberRole, memberId, isHubLocked);
  }

  public async getAlbums(memberRole: string, memberId: string, isHubLocked: boolean = false): Promise<PhotoAlbum[]> {
    return this.mediaRepo.getAlbums(memberRole, memberId, isHubLocked);
  }

  public async getAuthorizedMedia(
    mediaId: string,
    memberRole: string,
    memberId: string,
    isHubLocked: boolean = false
  ): Promise<MediaFile> {
    const file = await this.mediaRepo.getMediaById(mediaId);
    if (!file) {
      throw new Error('NOT_FOUND: Media file does not exist');
    }

    if (isHubLocked && file.Visibility !== 'FAMILY' && file.Visibility !== 'HUB') {
      throw new Error('ACCESS_DENIED: Media not visible on locked Family Hub');
    }

    if (memberRole === 'CHILD') {
      if (file.Visibility === 'PARENTS_ONLY') {
        throw new Error('ACCESS_DENIED: Media restricted to parents');
      }
      if (file.Visibility === 'PRIVATE' && file.Uploaded_By !== memberId) {
        throw new Error('ACCESS_DENIED: Private media file');
      }
    }

    return file;
  }

  public async streamMediaBytes(
    file: MediaFile
  ): Promise<{ stream?: ReadableStream<Uint8Array>; buffer?: Buffer; mimeType: string }> {
    if (isGoogleConfigured() && file.Drive_File_ID) {
      const driveData = await this.driveClient.downloadFileStream(file.Drive_File_ID);
      return {
        stream: driveData.stream,
        mimeType: file.Mime_Type || driveData.mimeType,
      };
    }

    // In DEV/preview mode without live Drive, return a safe SVG fallback image buffer
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
      <rect width="800" height="600" fill="#F7F6F4"/>
      <circle cx="400" cy="260" r="140" fill="#EA580C" opacity="0.85"/>
      <text x="400" y="275" font-family="-apple-system, sans-serif" font-size="28" font-weight="bold" fill="#FFFFFF" text-anchor="middle">Enguerra Family Photo</text>
      <text x="400" y="440" font-family="-apple-system, sans-serif" font-size="20" fill="#475569" text-anchor="middle">${file.Original_File_Name || file.File_Name}</text>
      <text x="400" y="480" font-family="-apple-system, sans-serif" font-size="16" fill="#94A3B8" text-anchor="middle">${file.Caption || 'Synced with private Google Drive storage'}</text>
    </svg>`;

    return {
      buffer: Buffer.from(svg, 'utf8'),
      mimeType: 'image/svg+xml',
    };
  }

  public async uploadMedia(params: {
    fileName: string;
    mimeType: string;
    buffer: Buffer;
    uploadedBy: string;
    visibility?: any;
    caption?: string;
    linkedEntityType?: any;
    linkedEntityId?: string;
  }): Promise<MediaFile> {
    if (!this.ALLOWED_MIME_TYPES.has(params.mimeType)) {
      throw new Error(`UNSUPPORTED_MIME_TYPE: ${params.mimeType} is not permitted for family media`);
    }

    if (params.buffer.length > this.MAX_FILE_SIZE) {
      throw new Error(`FILE_TOO_LARGE: File exceeds maximum allowed size of 25MB`);
    }

    // Sanitize filename
    const sanitized = params.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const mediaId = `media-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    let driveFileId = `drive-mock-${Date.now()}`;
    let folderId = 'folder-enguerra-photos';

    if (isGoogleConfigured()) {
      const now = new Date();
      const yyyy = now.getFullYear().toString();
      const mm = (now.getMonth() + 1).toString().padStart(2, '0');

      // Ensure folder path: Photos/YYYY/MM
      const photosFolder = await this.driveClient.ensureFolder('Photos');
      const yearFolder = await this.driveClient.ensureFolder(yyyy, photosFolder);
      folderId = await this.driveClient.ensureFolder(mm, yearFolder);

      const driveFile = await this.driveClient.uploadFile({
        name: sanitized,
        mimeType: params.mimeType,
        folderId,
        buffer: params.buffer,
      });
      driveFileId = driveFile.id;
    }

    const mediaRecord: MediaFile = {
      Media_ID: mediaId,
      Drive_File_ID: driveFileId,
      Drive_Folder_ID: folderId,
      File_Name: sanitized,
      Original_File_Name: params.fileName,
      Mime_Type: params.mimeType,
      Size_Bytes: params.buffer.length,
      Uploaded_By: params.uploadedBy,
      Visibility: params.visibility || 'FAMILY',
      Linked_Entity_Type: params.linkedEntityType,
      Linked_Entity_ID: params.linkedEntityId,
      Caption: params.caption || '',
      Taken_At: new Date().toISOString(),
      Created_At: new Date().toISOString(),
      Updated_At: new Date().toISOString(),
      Version: 1,
      Deleted_At: null,
    };

    await this.mediaRepo.createMediaRecord(mediaRecord);

    await this.auditRepo.logActivity({
      memberId: params.uploadedBy,
      action: 'UPLOAD_MEDIA',
      entityType: 'MEDIA',
      entityId: mediaId,
      details: { fileName: sanitized, size: params.buffer.length },
    });

    return mediaRecord;
  }
}
