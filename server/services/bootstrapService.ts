import { BootstrapResponse } from '../../src/types';
import { FamilyMembersRepository } from '../repositories/familyMembersRepository';
import { SheetStore } from '../storage/sheetStore';
import { AuthService } from './authService';
import { LegacyAuthAdapter } from './legacyAuthAdapter';
import { isGoogleConfigured } from '../google/auth';

export class BootstrapService {
  private membersRepo = new FamilyMembersRepository();
  private authService = new AuthService();
  private store = SheetStore.getInstance();
  private legacyAdapter = LegacyAuthAdapter.getInstance();

  public async getBootstrap(sessionId?: string): Promise<BootstrapResponse> {
    let session = undefined;
    if (sessionId) {
      const valid = await this.authService.validateSession(sessionId);
      if (valid) {
        session = valid;
      }
    }

    const members = await this.membersRepo.getAll();
    const dataVersions = this.store.getDataVersions();
    const legacyStatus = this.legacyAdapter.getStatus();
    const googleConn = isGoogleConfigured();

    return {
      authenticated: Boolean(session),
      session,
      familyMembers: members.filter(m => !m.Deleted_At && m.Status === 'ACTIVE'),
      dataVersions,
      system: {
        appEnv: (process.env.ENGUERRA_ENV as any) || 'DEV',
        serverVersion: '2.4.0-migration',
        legacyAuthStatus: {
          isGuaranteedCompatible: legacyStatus.isGuaranteedCompatible,
          status: legacyStatus.status,
          message: legacyStatus.message,
        },
        googleConnected: {
          sheets: googleConn,
          drive: googleConn,
          storageMode: googleConn ? 'LIVE_GOOGLE_CLOUD' : 'EMULATED_LOCAL_REPOSITORIES',
        },
      },
    };
  }
}
