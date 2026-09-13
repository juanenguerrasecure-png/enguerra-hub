import { SheetStore } from '../storage/sheetStore';

export class AuditRepository {
  private store = SheetStore.getInstance();

  public async logActivity(params: {
    memberId: string;
    action: string;
    entityType: string;
    entityId: string;
    details?: Record<string, any>;
  }): Promise<void> {
    const entry = {
      Activity_ID: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      Member_ID: params.memberId,
      Action: params.action,
      Entity_Type: params.entityType,
      Entity_ID: params.entityId,
      Details_JSON: params.details ? JSON.stringify(params.details) : '',
      Timestamp: new Date().toISOString(),
    };
    await this.store.upsertRecord('Activity_Log', 'Activity_ID', entry);
  }

  public async logRequest(params: {
    requestId: string;
    memberId: string;
    endpoint: string;
    method: string;
    statusCode: number;
    requestHash?: string;
  }): Promise<void> {
    const entry = {
      Request_ID: params.requestId,
      Member_ID: params.memberId,
      Endpoint: params.endpoint,
      Method: params.method,
      Status_Code: params.statusCode,
      Request_Hash: params.requestHash || '',
      Timestamp: new Date().toISOString(),
    };
    await this.store.upsertRecord('Request_Log', 'Request_ID', entry);
  }

  public async logApp(level: 'INFO' | 'WARN' | 'ERROR', message: string, context?: Record<string, any>): Promise<void> {
    const entry = {
      Log_ID: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      Level: level,
      Message: message,
      Context_JSON: context ? JSON.stringify(context) : '',
      Timestamp: new Date().toISOString(),
    };
    await this.store.upsertRecord('App_Log', 'Log_ID', entry);
  }

  public async getRecentActivity(limit: number = 20): Promise<any[]> {
    const all = await this.store.getTableRecords<any>('Activity_Log');
    return all
      .sort((a, b) => new Date(b.Timestamp).getTime() - new Date(a.Timestamp).getTime())
      .slice(0, limit);
  }
}
