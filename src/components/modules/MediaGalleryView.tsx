import React, { useState, useEffect } from 'react';
import { MediaFile, PhotoAlbum } from '../../types';
import { api } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import {
  Image as ImageIcon,
  UploadCloud,
  FolderPlus,
  Lock,
  Sparkles,
  Calendar,
  X,
  Eye,
  Shield
} from 'lucide-react';

export const MediaGalleryView: React.FC = () => {
  const { session, members } = useAuth();
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [albums, setAlbums] = useState<PhotoAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<MediaFile | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Upload Form
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadMime, setUploadMime] = useState('image/jpeg');
  const [uploadBase64, setUploadBase64] = useState('');
  const [uploadCaption, setUploadCaption] = useState('');
  const [uploadVisibility, setUploadVisibility] = useState<'FAMILY' | 'PARENTS_ONLY' | 'PRIVATE'>('FAMILY');
  const [uploading, setUploading] = useState(false);

  const fetchMediaData = async () => {
    try {
      setLoading(true);
      const [m, a] = await Promise.all([api.getMedia(), api.getAlbums()]);
      setMedia(m);
      setAlbums(a);
    } catch (err) {
      console.error('Failed to load media:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMediaData();
  }, []);

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFileName(file.name);
    setUploadMime(file.type || 'image/jpeg');

    const reader = new FileReader();
    reader.onload = event => {
      const base64 = event.target?.result as string;
      setUploadBase64(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadBase64) return;

    setUploading(true);
    try {
      await api.uploadMedia({
        fileName: uploadFileName,
        mimeType: uploadMime,
        base64Data: uploadBase64,
        caption: uploadCaption,
        visibility: uploadVisibility,
      });

      setIsUploadModalOpen(false);
      setUploadFileName('');
      setUploadBase64('');
      setUploadCaption('');
      fetchMediaData();
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const getMember = (id: string) => members.find(m => m.Member_ID === id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight flex items-center space-x-2">
            <ImageIcon className="w-5 h-5 text-orange-700" />
            <span>Family Photo Memories</span>
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Private Google Drive storage • Streamed securely with role authorization
          </p>
        </div>

        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-orange-700 hover:bg-orange-800 text-white font-medium text-xs shadow-xs transition-colors shrink-0"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Memory</span>
        </button>
      </div>

      {/* Albums Showcase */}
      {albums.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">Featured Albums</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {albums.map(album => (
              <div
                key={album.Album_ID}
                className="bg-white rounded-2xl p-4 border border-stone-200 shadow-xs hover:border-stone-300 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center text-orange-800 font-bold shrink-0">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-stone-900">{album.Name}</h4>
                    <p className="text-xs text-stone-500 line-clamp-1">{album.Description}</p>
                    <span className="text-[10px] text-stone-400 font-semibold uppercase mt-1 inline-block">
                      {album.Visibility}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Photos Grid */}
      {loading ? (
        <div className="text-center py-12 text-stone-400 text-xs">Loading family gallery...</div>
      ) : media.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-stone-200">
          <ImageIcon className="w-10 h-10 text-stone-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-stone-800">No photos uploaded yet</p>
          <p className="text-xs text-stone-400 mt-1">Tap 'Upload Memory' to store photos in private Drive.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {media.map(file => {
            const uploader = getMember(file.Uploaded_By);
            const isParents = file.Visibility === 'PARENTS_ONLY';

            return (
              <div
                key={file.Media_ID}
                onClick={() => setSelectedPhoto(file)}
                className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
              >
                {/* Photo Thumbnail */}
                <div className="aspect-square bg-stone-100 relative overflow-hidden flex items-center justify-center">
                  <img
                    src={api.getMediaStreamUrl(file.Media_ID)}
                    alt={file.Caption || file.File_Name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    referrerPolicy="no-referrer"
                    onError={(e: any) => {
                      e.target.onerror = null;
                      e.target.src = '/icon.svg';
                    }}
                  />
                  {isParents && (
                    <span className="absolute top-2 left-2 bg-rose-900/80 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center space-x-1 backdrop-blur-xs">
                      <Shield className="w-3 h-3" />
                      <span>Parents</span>
                    </span>
                  )}
                </div>

                <div className="p-3">
                  <div className="text-xs font-semibold text-stone-900 truncate">
                    {file.Caption || file.Original_File_Name}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-stone-400 mt-1">
                    <span>{uploader?.Display_Name || 'Family'}</span>
                    <span>{new Date(file.Created_At).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Photo Viewer Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-md p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="p-4 border-b border-stone-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-stone-900">
                  {selectedPhoto.Caption || selectedPhoto.Original_File_Name}
                </h3>
                <span className="text-[11px] text-stone-400">
                  Drive File ID: {selectedPhoto.Drive_File_ID} • {selectedPhoto.Visibility}
                </span>
              </div>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-stone-950 max-h-[60vh] flex items-center justify-center p-2">
              <img
                src={api.getMediaStreamUrl(selectedPhoto.Media_ID)}
                alt={selectedPhoto.Caption}
                className="max-h-[58vh] max-w-full object-contain rounded-lg shadow-md"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="p-4 bg-stone-50 text-xs text-stone-600 flex items-center justify-between">
              <div>
                <span>Uploaded by <strong>{getMember(selectedPhoto.Uploaded_By)?.Display_Name || 'Family'}</strong></span>
                <span className="mx-2">•</span>
                <span>{new Date(selectedPhoto.Created_At).toLocaleDateString()}</span>
              </div>
              <span className="text-[11px] text-stone-400 font-mono">
                {Math.round(selectedPhoto.Size_Bytes / 1024)} KB
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Upload Photo Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-stone-200">
            <h3 className="text-base font-bold text-stone-900 pb-3 border-b border-stone-100">
              Upload to Private Drive
            </h3>
            <form onSubmit={handleUploadSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Select Image</label>
                <input
                  type="file"
                  required
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={handleFileSelection}
                  className="w-full text-xs text-stone-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Caption / Story</label>
                <input
                  type="text"
                  placeholder="e.g. Amber winning 1st place in robotics!"
                  value={uploadCaption}
                  onChange={e => setUploadCaption(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-600"
                />
              </div>

              {session?.isParent && (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Visibility</label>
                  <select
                    value={uploadVisibility}
                    onChange={e => setUploadVisibility(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-orange-600"
                  >
                    <option value="FAMILY">Family & Ambient Refrigerator Display</option>
                    <option value="PARENTS_ONLY">Parents Only (Private Docs / Receipts)</option>
                    <option value="PRIVATE">Private to Me</option>
                  </select>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-stone-600 hover:bg-stone-100 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading || !uploadBase64}
                  className="px-4 py-2 rounded-xl bg-orange-700 hover:bg-orange-800 disabled:opacity-50 text-white text-xs font-medium shadow-xs"
                >
                  {uploading ? 'Uploading to Drive...' : 'Save Photo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
