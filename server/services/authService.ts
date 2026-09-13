import crypto from 'crypto';
import { FamilyMember, AuthUserSession, DeviceShell } from '../../src/types';
import { FamilyMembersRepository } from '../repositories/familyMembersRepository';
import { SessionsRepository, SessionRecord } from '../repositories/sessionsRepository';
import { AuditRepository } from '../repositories/auditRepository';
import { LegacyAuthAdapter } from './legacyAuthAdapter';

export class AuthService {
  private membersRepo = new FamilyMembersRepository();
  private sessionsRepo = new SessionsRepository();
  private auditRepo = new AuditRepository();
  private legacyAdapter = LegacyAuthAdapter.getInstance();

  private MAX_FAILED_ATTEMPTS = 5;
  private LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 mins

  public determineShell(member: FamilyMember, deviceType: string): DeviceShell {
    if (deviceType === 'HUB') return 'FAMILY_HUB';
    if (member.Role === 'OWNER' || member.Role === 'ADMIN') return 'PARENT';

    // Check age for kids shell
    if (member.Birth_Date) {
      const birthYear = new Date(member.Birth_Date).getFullYear();
      const currentYear = new Date().getFullYear();
      const age = currentYear - birthYear;
      if (age <= 4) return 'KIDS_TODDLER';
    }

    if (member.First_Name.toLowerCase() === 'adine') {
      return 'KIDS_TODDLER';
    }

    return 'KIDS_OLDER';
  }

  public async login(params: {
    memberId: string;
    pin: string;
    deviceType: 'BROWSER' | 'MOBILE' | 'TABLET' | 'HUB';
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ session: AuthUserSession; token: string }> {
    const member = await this.membersRepo.getById(params.memberId);
    if (!member) {
      throw new Error('MEMBER_NOT_FOUND: Selected family member does not exist');
    }

    // Check Auth_State for lockout
    const authState = await this.sessionsRepo.getAuthState(params.memberId);
    if (authState.Lockout_Until && new Date(authState.Lockout_Until).getTime() > Date.now()) {
      const waitMins = Math.ceil((new Date(authState.Lockout_Until).getTime() - Date.now()) / 60000);
      throw new Error(`ACCOUNT_LOCKED: Too many failed PIN attempts. Locked for ${waitMins} more minutes.`);
    }

    // Retrieve hash and salt securely server-side
    const secrets = await this.membersRepo.getAuthSecrets(params.memberId);
    const valid = this.legacyAdapter.verifyPin(
      params.pin,
      secrets?.pinHash || '',
      secrets?.pinSalt || '',
      member.Role
    );

    if (!valid) {
      const failed = authState.Failed_Attempts + 1;
      const lockout = failed >= this.MAX_FAILED_ATTEMPTS
        ? new Date(Date.now() + this.LOCKOUT_DURATION_MS).toISOString()
        : null;

      await this.sessionsRepo.updateAuthState({
        Member_ID: params.memberId,
        Failed_Attempts: failed,
        Lockout_Until: lockout,
        Last_Failed_At: new Date().toISOString(),
        Updated_At: new Date().toISOString(),
      });

      await this.auditRepo.logActivity({
        memberId: params.memberId,
        action: 'FAILED_PIN_ATTEMPT',
        entityType: 'AUTH',
        entityId: params.memberId,
        details: { attempts: failed, locked: !!lockout },
      });

      throw new Error('INVALID_PIN: The PIN entered is incorrect');
    }

    // Success: reset failed attempts
    await this.sessionsRepo.updateAuthState({
      Member_ID: params.memberId,
      Failed_Attempts: 0,
      Lockout_Until: null,
      Last_Login_At: new Date().toISOString(),
      Updated_At: new Date().toISOString(),
    });

    // Create session token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const sessionId = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

    const sessionRecord: SessionRecord = {
      Session_ID: sessionId,
      Member_ID: params.memberId,
      Device_Type: params.deviceType,
      Token_Hash: tokenHash,
      IP_Address: params.ipAddress,
      User_Agent: params.userAgent,
      Expires_At: expiresAt,
      Created_At: new Date().toISOString(),
      Last_Active_At: new Date().toISOString(),
      Revoked_At: null,
    };

    await this.sessionsRepo.createSession(sessionRecord);

    await this.auditRepo.logActivity({
      memberId: params.memberId,
      action: 'MEMBER_LOGIN',
      entityType: 'SESSION',
      entityId: sessionId,
      details: { deviceType: params.deviceType },
    });

    const shell = this.determineShell(member, params.deviceType);
    const userSession: AuthUserSession = {
      sessionId,
      member: {
        ...member,
      },
      deviceType: params.deviceType,
      isParent: member.Role === 'OWNER' || member.Role === 'ADMIN',
      isChild: member.Role === 'CHILD',
      shell,
      hubLocked: params.deviceType === 'HUB',
    };

    return { session: userSession, token };
  }

  public async validateSession(sessionId: string): Promise<AuthUserSession | null> {
    const session = await this.sessionsRepo.getSession(sessionId);
    if (!session) return null;

    const member = await this.membersRepo.getById(session.Member_ID);
    if (!member || member.Status !== 'ACTIVE') return null;

    const shell = this.determineShell(member, session.Device_Type);
    return {
      sessionId: session.Session_ID,
      member,
      deviceType: session.Device_Type as any,
      isParent: member.Role === 'OWNER' || member.Role === 'ADMIN',
      isChild: member.Role === 'CHILD',
      shell,
      hubLocked: session.Device_Type === 'HUB',
    };
  }

  public async logout(sessionId: string): Promise<void> {
    await this.sessionsRepo.revokeSession(sessionId);
  }

  public async getParityReport() {
    return this.legacyAdapter.getMemberAuthParityReport();
  }
}
