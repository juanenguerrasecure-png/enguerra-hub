import { FamilyMember } from '../../src/types';
import { GoogleSheetsFamilyRepository } from './googleSheetsFamilyRepository';

export class FamilyMembersRepository {
  private repo = GoogleSheetsFamilyRepository.getInstance();

  public async getAll(): Promise<FamilyMember[]> {
    return this.repo.getAll({ includeInactive: true });
  }

  public async getById(memberId: string): Promise<FamilyMember | null> {
    return this.repo.getById(memberId);
  }

  public async getAuthSecrets(memberId: string): Promise<{ pinHash: string; pinSalt: string } | null> {
    return this.repo.getAuthSecrets(memberId);
  }

  public async update(member: Partial<FamilyMember> & { Member_ID: string }): Promise<void> {
    await this.repo.updateMember(member.Member_ID, member);
  }

  public async updateProfile(
    memberId: string,
    updates: {
      First_Name?: string;
      Last_Name?: string;
      Display_Name?: string;
      Role?: 'OWNER' | 'ADMIN' | 'CHILD';
      Birth_Date?: string;
      Color?: string;
      Avatar_Key?: string;
      Avatar_URL?: string;
      Avatar_Media_ID?: string;
      Status?: 'ACTIVE' | 'INACTIVE';
      pin?: string;
    }
  ): Promise<FamilyMember> {
    return this.repo.updateMember(memberId, updates);
  }
}
