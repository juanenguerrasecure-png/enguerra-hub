import { MediaFile, PhotoAlbum, PhotoAlbumItem, EntityVisibility } from '../../src/types';
import { SheetStore } from '../storage/sheetStore';

export class MediaRepository {
  private store = SheetStore.getInstance();

  public async getMediaFiles(memberRole: string, memberId: string, isHubLocked: boolean = false): Promise<MediaFile[]> {
    const raw = await this.store.getTableRecords<any>('Media_Files');
    const files: MediaFile[] = raw.map(r => ({
      Media_ID: r.Media_ID,
      Drive_File_ID: r.Drive_File_ID,
      Drive_Folder_ID: r.Drive_Folder_ID,
      File_Name: r.File_Name,
      Original_File_Name: r.Original_File_Name,
      Mime_Type: r.Mime_Type,
      Size_Bytes: Number(r.Size_Bytes) || 0,
      Width: r.Width ? Number(r.Width) : undefined,
      Height: r.Height ? Number(r.Height) : undefined,
      Uploaded_By: r.Uploaded_By,
      Visibility: (r.Visibility || 'FAMILY') as EntityVisibility,
      Linked_Entity_Type: r.Linked_Entity_Type,
      Linked_Entity_ID: r.Linked_Entity_ID,
      Caption: r.Caption || '',
      Taken_At: r.Taken_At,
      Created_At: r.Created_At,
      Updated_At: r.Updated_At,
      Version: Number(r.Version) || 1,
      Deleted_At: r.Deleted_At || null,
    }));

    return files.filter(f => {
      if (f.Deleted_At) return false;
      if (isHubLocked) return f.Visibility === 'FAMILY' || f.Visibility === 'HUB';
      if (memberRole === 'OWNER' || memberRole === 'ADMIN') return true;
      if (memberRole === 'CHILD') {
        if (f.Visibility === 'PARENTS_ONLY') return false;
        if (f.Visibility === 'PRIVATE' && f.Uploaded_By !== memberId) return false;
        return true;
      }
      return f.Visibility === 'FAMILY';
    });
  }

  public async getMediaById(mediaId: string): Promise<MediaFile | null> {
    const raw = await this.store.getRecordById<any>('Media_Files', 'Media_ID', mediaId);
    if (!raw || raw.Deleted_At) return null;
    return {
      Media_ID: raw.Media_ID,
      Drive_File_ID: raw.Drive_File_ID,
      Drive_Folder_ID: raw.Drive_Folder_ID,
      File_Name: raw.File_Name,
      Original_File_Name: raw.Original_File_Name,
      Mime_Type: raw.Mime_Type,
      Size_Bytes: Number(raw.Size_Bytes) || 0,
      Width: raw.Width ? Number(raw.Width) : undefined,
      Height: raw.Height ? Number(raw.Height) : undefined,
      Uploaded_By: raw.Uploaded_By,
      Visibility: (raw.Visibility || 'FAMILY') as EntityVisibility,
      Linked_Entity_Type: raw.Linked_Entity_Type,
      Linked_Entity_ID: raw.Linked_Entity_ID,
      Caption: raw.Caption || '',
      Taken_At: raw.Taken_At,
      Created_At: raw.Created_At,
      Updated_At: raw.Updated_At,
      Version: Number(raw.Version) || 1,
      Deleted_At: raw.Deleted_At || null,
    };
  }

  public async createMediaRecord(media: Omit<MediaFile, 'Version' | 'Created_At' | 'Updated_At'>): Promise<void> {
    await this.store.upsertRecord('Media_Files', 'Media_ID', media);
  }

  public async getAlbums(memberRole: string, memberId: string, isHubLocked: boolean = false): Promise<PhotoAlbum[]> {
    const raw = await this.store.getTableRecords<any>('Photo_Albums');
    const albums: PhotoAlbum[] = raw.map(r => ({
      Album_ID: r.Album_ID,
      Name: r.Name,
      Description: r.Description || '',
      Cover_Media_ID: r.Cover_Media_ID || '',
      Visibility: (r.Visibility || 'FAMILY') as EntityVisibility,
      Created_By: r.Created_By,
      Created_At: r.Created_At,
      Updated_At: r.Updated_At,
      Version: Number(r.Version) || 1,
      Deleted_At: r.Deleted_At || null,
    }));

    return albums.filter(a => {
      if (a.Deleted_At) return false;
      if (isHubLocked) return a.Visibility === 'FAMILY' || a.Visibility === 'HUB';
      if (memberRole === 'OWNER' || memberRole === 'ADMIN') return true;
      if (memberRole === 'CHILD') {
        if (a.Visibility === 'PARENTS_ONLY') return false;
        if (a.Visibility === 'PRIVATE' && a.Created_By !== memberId) return false;
        return true;
      }
      return a.Visibility === 'FAMILY';
    });
  }

  public async createAlbum(album: Omit<PhotoAlbum, 'Version' | 'Created_At' | 'Updated_At'>): Promise<void> {
    await this.store.upsertRecord('Photo_Albums', 'Album_ID', album);
  }

  public async deleteMedia(mediaId: string): Promise<void> {
    await this.store.softDeleteRecord('Media_Files', 'Media_ID', mediaId);
  }
}
