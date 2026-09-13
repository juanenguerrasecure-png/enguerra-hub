/**
 * Enguerra of NY - Authoritative Domain and Application Types
 * Standardized across Client and Server
 */

export type FamilyRole = 'OWNER' | 'ADMIN' | 'CHILD';
export type EntityVisibility = 'FAMILY' | 'PARENTS_ONLY' | 'PRIVATE' | 'HUB';
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'APPROVED' | 'REOPENED';
export type DeviceShell = 'PARENT' | 'KIDS_OLDER' | 'KIDS_TODDLER' | 'FAMILY_HUB';

export interface FamilyMember {
  Member_ID: string;
  First_Name: string;
  Last_Name: string;
  Display_Name: string;
  Role: FamilyRole;
  Birth_Date: string; // YYYY-MM-DD
  Color: string;
  Avatar_Key?: string;
  Avatar_URL?: string;
  Avatar_Media_ID?: string;
  Status: 'ACTIVE' | 'INACTIVE';
  Created_At: string;
  Updated_At: string;
  Version: number;
  Deleted_At?: string | null;
}

export interface AccessPermission {
  Access_ID: string;
  Member_ID: string;
  Resource: string;
  Action: string;
  Allowed: boolean;
  Created_At: string;
  Updated_At: string;
}

export interface UserPreferences {
  Preference_ID: string;
  Member_ID: string;
  Theme: 'light' | 'warm' | 'dark';
  Notifications_Enabled: boolean;
  Hub_Ambient_Interval: number; // in seconds (e.g. 15, 30, 60)
  Settings_JSON: string; // serialized JSON
  Updated_At: string;
}

export interface CalendarEvent {
  Event_ID: string;
  Title: string;
  Description?: string;
  Start_Time: string; // ISO string
  End_Time: string;   // ISO string
  Location?: string;
  Assigned_Members: string[]; // Member_IDs
  Visibility: EntityVisibility;
  Category: 'FAMILY' | 'SCHOOL' | 'ACTIVITY' | 'WORK' | 'APPOINTMENT' | 'SPECIAL';
  Color: string;
  Created_By: string;
  Created_At: string;
  Updated_At: string;
  Version: number;
  Deleted_At?: string | null;
}

export interface TaskItem {
  Task_ID: string;
  Title: string;
  Description?: string;
  Due_Date: string; // YYYY-MM-DD
  Assigned_To: string; // Member_ID
  Status: TaskStatus;
  Priority: 'LOW' | 'MEDIUM' | 'HIGH';
  Visibility: EntityVisibility;
  Category: 'ROUTINE' | 'CHORE' | 'HOMEWORK' | 'PROJECT' | 'SELF_CARE';
  Points: number;
  Approved_By?: string | null;
  Created_By: string;
  Created_At: string;
  Updated_At: string;
  Version: number;
  Deleted_At?: string | null;
}

export interface TaskResponsibility {
  Responsibility_ID: string;
  Title: string;
  Category: string;
  Recurrence: 'DAILY' | 'WEEKLY' | 'SCHOOL_DAYS' | 'WEEKENDS';
  Assigned_To: string;
  Target_Days: string[]; // ['MON', 'TUE', ...]
  Points: number;
  Active: boolean;
  Created_At: string;
  Updated_At: string;
  Version: number;
  Deleted_At?: string | null;
}

export interface TaskHistoryEntry {
  History_ID: string;
  Task_ID: string;
  Member_ID: string;
  Action: 'CREATED' | 'STARTED' | 'COMPLETED' | 'APPROVED' | 'REOPENED';
  Points_Awarded: number;
  Timestamp: string;
  Note?: string;
}

export interface FamilyList {
  List_ID: string;
  Title: string;
  Category: 'GROCERY' | 'HOUSEHOLD' | 'PACKING' | 'WISHLIST' | 'GENERAL';
  Icon?: string;
  Visibility: EntityVisibility;
  Created_By: string;
  Created_At: string;
  Updated_At: string;
  Version: number;
  Deleted_At?: string | null;
}

export interface FamilyListItem {
  Item_ID: string;
  List_ID: string;
  Title: string;
  Quantity?: string;
  Completed: boolean;
  Completed_By?: string | null;
  Added_By: string;
  Created_At: string;
  Updated_At: string;
  Version: number;
  Deleted_At?: string | null;
}

export interface ChatThread {
  Thread_ID: string;
  Title: string;
  Thread_Type: 'FAMILY' | 'PARENTS' | 'DIRECT';
  Participant_IDs: string[];
  Last_Message_At: string;
  Created_At: string;
  Updated_At: string;
  Version: number;
  Deleted_At?: string | null;
}

export interface ChatMessage {
  Message_ID: string;
  Thread_ID: string;
  Sender_ID: string;
  Content: string;
  Attachment_Drive_ID?: string;
  Attachment_Mime?: string;
  Attachment_Name?: string;
  Created_At: string;
  Updated_At: string;
  Version: number;
  Deleted_At?: string | null;
}

export interface ChatReadState {
  Read_State_ID: string;
  Thread_ID: string;
  Member_ID: string;
  Last_Read_Message_ID: string;
  Last_Read_At: string;
  Version: number;
}

export interface MediaFile {
  Media_ID: string;
  Drive_File_ID: string;
  Drive_Folder_ID: string;
  File_Name: string;
  Original_File_Name: string;
  Mime_Type: string;
  Size_Bytes: number;
  Width?: number;
  Height?: number;
  Uploaded_By: string;
  Visibility: EntityVisibility;
  Linked_Entity_Type?: 'AVATAR' | 'ALBUM' | 'CHAT' | 'DOCUMENT' | 'TASK' | 'EVENT';
  Linked_Entity_ID?: string;
  Caption?: string;
  Taken_At?: string;
  Created_At: string;
  Updated_At: string;
  Version: number;
  Deleted_At?: string | null;
}

export interface PhotoAlbum {
  Album_ID: string;
  Name: string;
  Description?: string;
  Cover_Media_ID?: string;
  Visibility: EntityVisibility;
  Created_By: string;
  Created_At: string;
  Updated_At: string;
  Version: number;
  Deleted_At?: string | null;
}

export interface PhotoAlbumItem {
  Album_Item_ID: string;
  Album_ID: string;
  Media_ID: string;
  Sort_Order: number;
  Added_By: string;
  Added_At: string;
  Deleted_At?: string | null;
}

export interface ActivityLogEntry {
  Activity_ID: string;
  Member_ID: string;
  Action: string;
  Entity_Type: string;
  Entity_ID: string;
  Details_JSON?: string;
  Timestamp: string;
}

export interface AppConfigEntry {
  Key: string;
  Value: string;
  Description?: string;
  Updated_At: string;
  Updated_By: string;
}

export interface DataVersionsMap {
  [entityName: string]: number;
}

// Session & Auth
export interface AuthUserSession {
  sessionId: string;
  member: FamilyMember;
  deviceType: 'BROWSER' | 'MOBILE' | 'TABLET' | 'HUB';
  isParent: boolean;
  isChild: boolean;
  shell: DeviceShell;
  hubLocked?: boolean;
}

export interface BootstrapResponse {
  authenticated: boolean;
  session?: AuthUserSession;
  familyMembers: FamilyMember[];
  dataVersions: DataVersionsMap;
  system: {
    appEnv: 'DEV' | 'QA' | 'PROD';
    serverVersion: string;
    legacyAuthStatus: {
      isGuaranteedCompatible: boolean;
      status: string;
      message: string;
    };
    googleConnected: {
      sheets: boolean;
      drive: boolean;
      storageMode: 'LIVE_GOOGLE_CLOUD' | 'EMULATED_LOCAL_REPOSITORIES';
    };
  };
}

export interface MemberAuthParityStatus {
  memberId: string;
  name: string;
  role: string;
  hasStoredHash: boolean;
  hasStoredSalt: boolean;
  detectedAlgorithm: string;
  parityVerified: boolean;
  resetsRequired: boolean;
  lastUpdated?: string;
}

export interface AuthParityReportResponse {
  success: boolean;
  engine: string;
  totalMembers: number;
  verifiedMembers: number;
  passwordResetsRequired: number;
  constantTimeEnforced: boolean;
  reports: MemberAuthParityStatus[];
}

export interface DiagnosticCheckItem {
  id: string;
  name: string;
  category: 'CORE' | 'SHEETS' | 'DRIVE' | 'AUTH' | 'SECURITY' | 'SCHEMA';
  status: 'PASS' | 'WARN' | 'FAIL';
  details: string;
  timestamp: string;
}

export interface DiagnosticsReport {
  timestamp: string;
  environment: string;
  serverVersion: string;
  clientVersion: string;
  storageMode: string;
  sheetsConnected: boolean;
  driveConnected: boolean;
  checks: DiagnosticCheckItem[];
  tabsVerified: string[];
  missingTabs: string[];
  dataVersions: DataVersionsMap;
}
