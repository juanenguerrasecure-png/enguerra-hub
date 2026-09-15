import { TaskStatus, TaskItem, FamilyMember } from '../../../types';
import {
  Circle,
  Clock,
  Sparkles,
  CheckCircle2,
  RotateCcw,
  XCircle,
  CheckSquare,
  Sun,
  BookOpen,
  Folder,
  Heart
} from 'lucide-react';

export type CanonicalTaskStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'PENDING_APPROVAL'
  | 'VERIFIED'
  | 'REOPENED'
  | 'CANCELLED';

export const TASK_WORKFLOW_ORDER: CanonicalTaskStatus[] = [
  'OPEN',
  'IN_PROGRESS',
  'PENDING_APPROVAL',
  'VERIFIED',
  'REOPENED',
  'CANCELLED',
];

export function normalizeTaskStatus(status?: string | null): CanonicalTaskStatus {
  if (!status) return 'OPEN';
  const s = status.toUpperCase();
  if (s === 'PENDING') return 'OPEN';
  if (s === 'COMPLETED') return 'PENDING_APPROVAL';
  if (s === 'APPROVED') return 'VERIFIED';
  if (TASK_WORKFLOW_ORDER.includes(s as CanonicalTaskStatus)) {
    return s as CanonicalTaskStatus;
  }
  return 'OPEN';
}

export interface StatusMeta {
  label: string;
  shortLabel: string;
  description: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  icon: typeof Circle;
  iconColor: string;
}

export const STATUS_CONFIG: Record<CanonicalTaskStatus, StatusMeta> = {
  OPEN: {
    label: 'To Do',
    shortLabel: 'Open',
    description: 'Ready to be started',
    badgeBg: 'bg-sky-50',
    badgeText: 'text-sky-700',
    badgeBorder: 'border-sky-200',
    icon: Circle,
    iconColor: 'text-sky-500',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    shortLabel: 'Working',
    description: 'Work has begun',
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-700',
    badgeBorder: 'border-indigo-200',
    icon: Clock,
    iconColor: 'text-indigo-500',
  },
  PENDING_APPROVAL: {
    label: 'Awaiting Parent Review',
    shortLabel: 'In Review',
    description: 'Child marked finished, waiting for approval',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-200',
    icon: Sparkles,
    iconColor: 'text-amber-600',
  },
  VERIFIED: {
    label: 'Verified & Approved',
    shortLabel: 'Verified',
    description: 'Parent verified completion and awarded points',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-800',
    badgeBorder: 'border-emerald-200',
    icon: CheckCircle2,
    iconColor: 'text-emerald-600',
  },
  REOPENED: {
    label: 'Needs Fixes / Reopened',
    shortLabel: 'Reopened',
    description: 'Parent requested revision',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-800',
    badgeBorder: 'border-rose-200',
    icon: RotateCcw,
    iconColor: 'text-rose-600',
  },
  CANCELLED: {
    label: 'Cancelled',
    shortLabel: 'Cancelled',
    description: 'Cancelled by parent',
    badgeBg: 'bg-stone-100',
    badgeText: 'text-stone-600',
    badgeBorder: 'border-stone-200',
    icon: XCircle,
    iconColor: 'text-stone-400',
  },
};

export const CATEGORY_CONFIG: Record<
  string,
  { label: string; icon: typeof CheckSquare; color: string; bg: string }
> = {
  CHORE: {
    label: 'Chore',
    icon: CheckSquare,
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
  },
  ROUTINE: {
    label: 'Routine',
    icon: Sun,
    color: 'text-amber-700',
    bg: 'bg-amber-50',
  },
  HOMEWORK: {
    label: 'School',
    icon: BookOpen,
    color: 'text-sky-700',
    bg: 'bg-sky-50',
  },
  PROJECT: {
    label: 'Project',
    icon: Folder,
    color: 'text-purple-700',
    bg: 'bg-purple-50',
  },
  SELF_CARE: {
    label: 'Self Care',
    icon: Heart,
    color: 'text-rose-700',
    bg: 'bg-rose-50',
  },
};
