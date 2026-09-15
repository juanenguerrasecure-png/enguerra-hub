import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { FamilyMember, FamilyRole } from '../../types';
import { FamilyAvatar } from '../ui/FamilyAvatar';
import {
  Users,
  Shield,
  ShieldAlert,
  Crown,
  Edit3,
  Calendar,
  Lock,
  Palette,
  CheckCircle2,
  X,
  Save,
  AlertCircle,
  Eye,
  EyeOff,
  UserCheck,
  Sparkles,
  Camera,
  Upload,
  Trash2,
  Image as ImageIcon
} from 'lucide-react';

const PRESET_COLORS = [
  { name: 'RN Spruce Green', hex: '#164E35' },
  { name: 'Terracotta', hex: '#EA580C' },
  { name: 'Sky Navy', hex: '#0284C7' },
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Violet', hex: '#8B5CF6' },
  { name: 'Amber Gold', hex: '#F59E0B' },
  { name: 'Rose Pink', hex: '#EC4899' },
  { name: 'Cyan Ocean', hex: '#06B6D4' },
  { name: 'Slate', hex: '#64748B' },
];

function calculateAge(birthDateStr: string): number | null {
  if (!birthDateStr) return null;
  const birth = new Date(birthDateStr);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

export const FamilyProfilesView: React.FC = () => {
  const { session, members, updateMemberProfile } = useAuth();

  const isCurrentUserOwner = session?.member.Role === 'OWNER';
  const currentMemberId = session?.member.Member_ID;

  // Selected member for modal
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);

  // Edit form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState<FamilyRole>('CHILD');
  const [birthDate, setBirthDate] = useState('');
  const [color, setColor] = useState('#EA580C');
  const [avatarKey, setAvatarKey] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [newPin, setNewPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'Selected image is larger than 5MB. Please select a smaller photo.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleOpenEdit = (member: FamilyMember) => {
    setEditingMember(member);
    setFirstName(member.First_Name || '');
    setLastName(member.Last_Name || '');
    setDisplayName(member.Display_Name || '');
    setRole(member.Role || 'CHILD');
    setBirthDate(member.Birth_Date || '');
    setColor(member.Color || '#EA580C');
    setAvatarKey(member.Avatar_Key || '');
    setAvatarUrl(member.Avatar_URL || '');
    setStatus(member.Status || 'ACTIVE');
    setNewPin('');
    setShowPin(false);
    setFeedback(null);
  };

  const handleCloseModal = () => {
    if (saving) return;
    setEditingMember(null);
    setFeedback(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    if (!displayName.trim() || !firstName.trim()) {
      setFeedback({ type: 'error', message: 'Display Name and First Name are required.' });
      return;
    }

    if (newPin.trim() && newPin.trim().length < 4) {
      setFeedback({ type: 'error', message: 'New PIN must be at least 4 digits.' });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const updates: any = {
        First_Name: firstName.trim(),
        Last_Name: lastName.trim(),
        Display_Name: displayName.trim(),
        Birth_Date: birthDate,
        Color: color,
        Avatar_Key: avatarKey || undefined,
        Avatar_URL: avatarUrl.trim() ? avatarUrl.trim() : '',
      };

      // Role and Status changes restricted to OWNER
      if (isCurrentUserOwner) {
        updates.Role = role;
        updates.Status = status;
      }

      // PIN reset
      if (newPin.trim()) {
        updates.pin = newPin.trim();
      }

      await updateMemberProfile(editingMember.Member_ID, updates);

      setFeedback({
        type: 'success',
        message: `Profile for ${displayName.trim()} successfully updated in Google Sheets!`,
      });

      setTimeout(() => {
        setEditingMember(null);
        setFeedback(null);
      }, 1200);
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to update member profile. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-orange-700" />
            <h2 className="text-xl font-bold text-stone-900 tracking-tight">Family Profiles & Accounts</h2>
            {isCurrentUserOwner && (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                <Crown className="w-3.5 h-3.5 text-amber-600" />
                <span>OWNER Controls Active</span>
              </span>
            )}
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Synchronized with <code className="font-mono bg-stone-100 px-1 py-0.5 rounded text-stone-700">Family_Members</code> and <code className="font-mono bg-stone-100 px-1 py-0.5 rounded text-stone-700">Access_Credentials</code> Google Sheet tabs.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs text-stone-500 bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-200">
          <UserCheck className="w-4 h-4 text-emerald-600" />
          <span>Signed in as <strong className="text-stone-800">{session?.member.Display_Name}</strong> ({session?.member.Role})</span>
        </div>
      </div>

      {/* OWNER Privileges Notice */}
      {isCurrentUserOwner ? (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-start space-x-3">
          <Crown className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold">Owner Authority Enabled</div>
            <p className="text-amber-800 leading-relaxed">
              As the household <strong>OWNER</strong>, you have full privileges to edit any member's profile, promote or reassign roles (Owner, Admin, Child), update birthdays, change color themes, and reset member PINs without requiring password reset emails or Apps Script redeployment.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 text-xs text-stone-600 flex items-start space-x-3">
          <Shield className="w-5 h-5 text-stone-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-stone-800">Self-Management Mode: </span>
            You can customize your display name, theme color, and avatar. Role changes, account status, and other member profiles can only be edited by the family OWNER (<strong className="text-stone-800">Juan (Dad)</strong>).
          </div>
        </div>
      )}

      {/* Member Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map(member => {
          const age = calculateAge(member.Birth_Date);
          const canEditThisMember = isCurrentUserOwner || currentMemberId === member.Member_ID;

          return (
            <div
              key={member.Member_ID}
              className={`bg-white rounded-2xl border p-5 shadow-xs transition-all relative flex flex-col justify-between ${
                member.Member_ID === currentMemberId
                  ? 'border-orange-300 ring-2 ring-orange-100'
                  : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <div>
                {/* Card Header: Avatar & Badges */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <FamilyAvatar
                      member={member}
                      size="touchAdult"
                      shape="squircle"
                      className="shrink-0"
                    />

                    <div>
                      <div className="flex items-center space-x-1.5">
                        <h3 className="text-base font-bold text-stone-900 leading-tight">
                          {member.Display_Name}
                        </h3>
                        {member.Member_ID === currentMemberId && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-orange-100 text-orange-800">
                            You
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-stone-500 mt-0.5 flex items-center space-x-1.5">
                        <span>{member.First_Name} {member.Last_Name}</span>
                        {member.Avatar_URL ? (
                          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Camera className="w-2.5 h-2.5" />
                            <span>Photo</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-stone-400 font-medium">
                            Monogram
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Role Badge */}
                  <span
                    className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                      member.Role === 'OWNER'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : member.Role === 'ADMIN'
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    {member.Role === 'OWNER' && <Crown className="w-3 h-3 text-amber-700" />}
                    {member.Role === 'ADMIN' && <Shield className="w-3 h-3 text-blue-700" />}
                    {member.Role === 'CHILD' && <Sparkles className="w-3 h-3 text-emerald-700" />}
                    <span>{member.Role}</span>
                  </span>
                </div>

                {/* Info List */}
                <div className="mt-4 pt-3 border-t border-stone-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-stone-600">
                    <span className="text-stone-400 flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Birthday:</span>
                    </span>
                    <span className="font-medium text-stone-800">
                      {member.Birth_Date || 'Not specified'} {age !== null && `(${age} yrs)`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-stone-600">
                    <span className="text-stone-400 flex items-center space-x-1">
                      <Palette className="w-3.5 h-3.5" />
                      <span>Theme Color:</span>
                    </span>
                    <div className="flex items-center space-x-1.5">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-stone-300 shadow-xs"
                        style={{ backgroundColor: member.Color || '#EA580C' }}
                      />
                      <span className="font-mono text-[11px] text-stone-700">{member.Color || '#EA580C'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-stone-600">
                    <span className="text-stone-400 flex items-center space-x-1">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Security:</span>
                    </span>
                    <span className="text-emerald-700 font-medium">SHA-256 + Salt Active</span>
                  </div>

                  <div className="flex items-center justify-between text-stone-600">
                    <span className="text-stone-400">Account Status:</span>
                    <span
                      className={`font-semibold ${
                        member.Status === 'ACTIVE' ? 'text-emerald-700' : 'text-stone-400'
                      }`}
                    >
                      {member.Status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-5 pt-3 border-t border-stone-100">
                {canEditThisMember ? (
                  <button
                    onClick={() => handleOpenEdit(member)}
                    className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isCurrentUserOwner ? 'Edit Profile & Settings' : 'Edit My Profile'}</span>
                  </button>
                ) : (
                  <div className="text-center py-2 text-xs text-stone-400 italic">
                    Requires OWNER account to edit
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Profile Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full border border-stone-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
              <div className="flex items-center space-x-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-base shadow-xs"
                  style={{ backgroundColor: color }}
                >
                  {firstName ? firstName.charAt(0) : editingMember.First_Name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900 leading-tight">
                    Edit Profile: {editingMember.Display_Name}
                  </h3>
                  <p className="text-xs text-stone-500">
                    {isCurrentUserOwner
                      ? 'OWNER administrative edit • Updates Google Sheets instantly'
                      : 'Self-profile preferences'}
                  </p>
                </div>
              </div>

              <button
                onClick={handleCloseModal}
                disabled={saving}
                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-200/50 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
              {feedback && (
                <div
                  className={`p-3 rounded-xl border flex items-center space-x-2 ${
                    feedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  {feedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{feedback.message}</span>
                </div>
              )}

              {/* Display Name */}
              <div>
                <label className="block font-semibold text-stone-800 mb-1">
                  Display Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="e.g. Juan (Dad), Amber"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 focus:outline-none focus:border-orange-600 focus:ring-1 focus:ring-orange-600"
                />
              </div>

              {/* First & Last Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-800 mb-1">
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 focus:outline-none focus:border-orange-600 focus:ring-1 focus:ring-orange-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-800 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 focus:outline-none focus:border-orange-600 focus:ring-1 focus:ring-orange-600"
                  />
                </div>
              </div>

              {/* Role Selection (Only OWNER can change role) */}
              <div>
                <label className="block font-semibold text-stone-800 mb-1">
                  Family Role {isCurrentUserOwner ? '(OWNER Authority)' : '(Read Only)'}
                </label>
                {isCurrentUserOwner ? (
                  <div className="grid grid-cols-3 gap-2">
                    {(['OWNER', 'ADMIN', 'CHILD'] as FamilyRole[]).map(r => (
                      <button
                        type="button"
                        key={r}
                        onClick={() => setRole(r)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          role === r
                            ? 'border-orange-600 bg-orange-50/70 text-orange-900 font-bold ring-1 ring-orange-600'
                            : 'border-stone-200 hover:border-stone-300 text-stone-700 bg-white'
                        }`}
                      >
                        <div className="flex items-center space-x-1">
                          {r === 'OWNER' && <Crown className="w-3.5 h-3.5 text-amber-600" />}
                          {r === 'ADMIN' && <Shield className="w-3.5 h-3.5 text-blue-600" />}
                          {r === 'CHILD' && <Sparkles className="w-3.5 h-3.5 text-emerald-600" />}
                          <span>{r}</span>
                        </div>
                        <div className="text-[10px] text-stone-500 mt-1">
                          {r === 'OWNER'
                            ? 'Household Owner'
                            : r === 'ADMIN'
                            ? 'Parent Admin'
                            : 'Kid Profile'}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-stone-100 border border-stone-200 text-stone-600 flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-stone-400" />
                    <span>Role is locked to <strong>{role}</strong>. Only the household OWNER can reassign member roles.</span>
                  </div>
                )}
              </div>

              {/* Birth Date */}
              <div>
                <label className="block font-semibold text-stone-800 mb-1">Birth Date</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={e => setBirthDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 focus:outline-none focus:border-orange-600 focus:ring-1 focus:ring-orange-600"
                />
              </div>

              {/* Theme Color Picker */}
              <div>
                <label className="block font-semibold text-stone-800 mb-1">Theme Color Palette</label>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {PRESET_COLORS.map(c => (
                    <button
                      type="button"
                      key={c.hex}
                      onClick={() => setColor(c.hex)}
                      title={c.name}
                      className={`w-7 h-7 rounded-full transition-transform cursor-pointer border-2 ${
                        color.toUpperCase() === c.hex.toUpperCase()
                          ? 'border-stone-900 scale-110 shadow-xs'
                          : 'border-white hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                  <div className="flex items-center space-x-1.5 ml-2">
                    <input
                      type="color"
                      value={color}
                      onChange={e => setColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-stone-300 p-0.5"
                    />
                    <span className="font-mono text-[11px] text-stone-600">{color}</span>
                  </div>
                </div>
              </div>

              {/* Profile Photo Upload & Settings */}
              <div className="space-y-3 p-4 rounded-2xl bg-stone-50 border border-stone-200">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-stone-800 flex items-center space-x-1.5 text-sm">
                    <Camera className="w-4 h-4 text-stone-700" />
                    <span>Profile Photo</span>
                  </label>
                  {avatarUrl ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Photo Attached</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-stone-500 font-medium">
                      Initials Monogram (Default)
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-4">
                  {/* Current Photo / Monogram Live Preview */}
                  <div className="relative shrink-0">
                    <FamilyAvatar
                      member={{
                        First_Name: firstName,
                        Last_Name: lastName,
                        Display_Name: displayName,
                        Avatar_URL: avatarUrl,
                        Color: color,
                      }}
                      size="xl"
                      shape="squircle"
                      className="w-16 h-16 shadow-xs ring-2 ring-white text-xl"
                    />
                  </div>

                  {/* Photo Actions */}
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handlePhotoFileChange}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-black text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Photo</span>
                      </button>

                      {avatarUrl && (
                        <button
                          type="button"
                          onClick={() => setAvatarUrl('')}
                          className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove Photo</span>
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-500 leading-normal">
                      Upload any JPG, PNG, or WebP photo from your device. If no photo is uploaded, a clean monogram avatar with your theme color is used automatically.
                    </p>
                  </div>
                </div>

                {/* Optional Direct Photo URL */}
                <div className="pt-2 border-t border-stone-200/80">
                  <label className="block text-[11px] font-medium text-stone-600 mb-1">
                    Or paste direct image URL (Google Drive, public photo link):
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="url"
                      value={avatarUrl}
                      onChange={e => setAvatarUrl(e.target.value)}
                      placeholder="https://..."
                      className="flex-1 px-3 py-1.5 rounded-xl border border-stone-300 text-stone-900 text-xs focus:outline-none focus:border-stone-800"
                    />
                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={() => setAvatarUrl('')}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200/60"
                        title="Clear URL"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* PIN Reset (OWNER or self) */}
              <div className="p-3.5 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-stone-800 flex items-center space-x-1.5">
                    <Lock className="w-3.5 h-3.5 text-orange-700" />
                    <span>Reset / Set Member PIN</span>
                  </label>
                  <span className="text-[10px] text-stone-500 font-medium">
                    {isCurrentUserOwner ? 'OWNER Overwrite' : 'Optional'}
                  </span>
                </div>
                <p className="text-[11px] text-stone-500">
                  Leave blank to retain current PIN. If entered, updates both Google Sheets <code className="font-mono bg-stone-200 px-1 py-0.5 rounded text-stone-700">Family_Members</code> and <code className="font-mono bg-stone-200 px-1 py-0.5 rounded text-stone-700">Access_Credentials</code> with salt + SHA-256 parity.
                </p>

                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    maxLength={6}
                    value={newPin}
                    onChange={e => setNewPin(e.target.value)}
                    placeholder="Enter new 4-digit PIN"
                    className="w-full px-3.5 py-2 pr-10 rounded-xl border border-stone-300 bg-white text-stone-900 tracking-wider focus:outline-none focus:border-orange-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-2.5 text-stone-400 hover:text-stone-600 cursor-pointer"
                  >
                    {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Status (Only OWNER can change status) */}
              {isCurrentUserOwner && (
                <div>
                  <label className="block font-semibold text-stone-800 mb-1">Account Status</label>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        checked={status === 'ACTIVE'}
                        onChange={() => setStatus('ACTIVE')}
                        className="text-orange-600 focus:ring-orange-500"
                      />
                      <span className="text-stone-800 font-medium">Active</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="radio"
                        name="status"
                        checked={status === 'INACTIVE'}
                        onChange={() => setStatus('INACTIVE')}
                        className="text-orange-600 focus:ring-orange-500"
                      />
                      <span className="text-stone-800 font-medium">Inactive / Suspended</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-stone-100 flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 font-medium cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-orange-700 hover:bg-orange-800 disabled:opacity-50 text-white font-semibold shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
