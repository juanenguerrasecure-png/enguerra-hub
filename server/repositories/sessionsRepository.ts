import { SheetStore } from '../storage/sheetStore';

export interface SessionRecord {
  Session_ID: string;
  Member_ID: string;
  Device_Type: string;
  Token_Hash: string;
  IP_Address?: string;
  User_Agent?: string;
  Expires_At: string;
  Created_At: string;
  Last_Active_At: string;
  Revoked_At?: string | null;
}

export interface AuthStateRecord {
  Member_ID: string;
  Failed_Attempts: number;
  Lockout_Until?: string | null;
  Last_Login_At?: string | null;
  Last_Failed_At?: string | null;
  Updated_At: string;
}

export class SessionsRepository {
  private store = SheetStore.getInstance();

  public async getSession(sessionId: string): Promise<SessionRecord | null> {
    const raw = await this.store.getRecordById<any>('Sessions', 'Session_ID', sessionId);
    if (!raw || raw.Revoked_At) return null;
    if (new Date(raw.Expires_At).getTime() < Date.now()) return null;
    return raw as SessionRecord;
  }

  public async createSession(session: SessionRecord): Promise<void> {
    await this.store.upsertRecord('Sessions', 'Session_ID', session);
  }

  public async revokeSession(sessionId: string): Promise<void> {
    const raw = await this.store.getRecordById<any>('Sessions', 'Session_ID', sessionId);
    if (raw) {
      await this.store.upsertRecord('Sessions', 'Session_ID', {
        ...raw,
        Revoked_At: new Date().toISOString(),
      });
    }
  }

  public async getAuthState(memberId: string): Promise<AuthStateRecord> {
    const raw = await this.store.getRecordById<any>('Auth_State', 'Member_ID', memberId);
    if (!raw) {
      return {
        Member_ID: memberId,
        Failed_Attempts: 0,
        Lockout_Until: null,
        Last_Login_At: null,
        Last_Failed_At: null,
        Updated_At: new Date().toISOString(),
      };
    }
    return {
      Member_ID: raw.Member_ID,
      Failed_Attempts: Number(raw.Failed_Attempts) || 0,
      Lockout_Until: raw.Lockout_Until || null,
      Last_Login_At: raw.Last_Login_At || null,
      Last_Failed_At: raw.Last_Failed_At || null,
      Updated_At: raw.Updated_At,
    };
  }

  public async updateAuthState(state: AuthStateRecord): Promise<void> {
    await this.store.upsertRecord('Auth_State', 'Member_ID', state);
  }
}
