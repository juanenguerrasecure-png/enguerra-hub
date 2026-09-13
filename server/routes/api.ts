import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { BootstrapService } from '../services/bootstrapService';
import { CalendarService } from '../services/calendarService';
import { TaskService } from '../services/taskService';
import { ListService } from '../services/listService';
import { MessageService } from '../services/messageService';
import { MediaService } from '../services/mediaService';
import { HubService } from '../services/hubService';
import { DiagnosticsService } from '../services/diagnosticsService';
import { MigrationService } from '../services/migrationService';
import { LegacyAuthService } from '../services/legacyAuthService';
import { FamilyMembersRepository } from '../repositories/familyMembersRepository';
import { AuditRepository } from '../repositories/auditRepository';
import { SheetStore } from '../storage/sheetStore';
import { AuthUserSession } from '../../src/types';

export interface AuthenticatedRequest extends Request {
  userSession?: AuthUserSession;
}

export function createApiRouter(): Router {
  const router = Router();

  const authService = new AuthService();
  const bootstrapService = new BootstrapService();
  const calendarService = new CalendarService();
  const taskService = new TaskService();
  const listService = new ListService();
  const messageService = new MessageService();
  const mediaService = new MediaService();
  const hubService = new HubService();
  const diagnosticsService = new DiagnosticsService();
  const migrationService = new MigrationService();
  const membersRepo = new FamilyMembersRepository();
  const auditRepo = new AuditRepository();
  const store = SheetStore.getInstance();

  // Auth Middleware
  const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const sessionId = (req.headers['x-session-id'] as string) || (req.query.session_id as string);
    if (sessionId) {
      try {
        const session = await authService.validateSession(sessionId);
        if (session) {
          req.userSession = session;
        }
      } catch (err) {
        console.warn('[AuthMiddleware] Session validation error:', err);
      }
    }
    next();
  };

  const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.userSession) {
      return res.status(401).json({ error: 'UNAUTHORIZED: Valid Enguerra session required' });
    }
    next();
  };

  const requireParent = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.userSession || !req.userSession.isParent) {
      return res.status(403).json({ error: 'FORBIDDEN: Parent authorization required' });
    }
    next();
  };

  router.use(authenticate);

  // Health
  router.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Enguerra of NY Server',
      timestamp: new Date().toISOString(),
      storageMode: store.isUsingLiveGoogle() ? 'LIVE_GOOGLE_CLOUD' : 'EMULATED_LOCAL_REPOSITORIES',
    });
  });

  // Bootstrap
  router.get('/bootstrap', async (req: AuthenticatedRequest, res) => {
    try {
      const sessionId = (req.headers['x-session-id'] as string) || (req.query.session_id as string);
      const data = await bootstrapService.getBootstrap(sessionId);
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Bootstrap failure' });
    }
  });

  // Auth: Login with PIN
  router.post('/auth/login', async (req: AuthenticatedRequest, res) => {
    try {
      const { memberId, pin, deviceType } = req.body;
      if (!memberId || !pin) {
        return res.status(400).json({ error: 'memberId and pin are required' });
      }

      const clientIp = req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'Unknown';

      const { session, token } = await authService.login({
        memberId,
        pin,
        deviceType: deviceType || 'BROWSER',
        ipAddress: clientIp,
        userAgent,
      });

      res.json({ success: true, session, token });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Authentication failed' });
    }
  });

  // Auth: Validate Session
  router.get('/auth/session', (req: AuthenticatedRequest, res) => {
    if (!req.userSession) {
      return res.json({ authenticated: false, session: null });
    }
    res.json({ authenticated: true, session: req.userSession });
  });

  // Auth: Logout
  router.post('/auth/logout', async (req: AuthenticatedRequest, res) => {
    if (req.userSession) {
      await authService.logout(req.userSession.sessionId);
    }
    res.json({ success: true });
  });

  // Auth: Legacy Compatibility Parity Report
  router.get('/auth/parity-report', async (req: AuthenticatedRequest, res) => {
    try {
      const reports = await authService.getParityReport();
      res.json({
        success: true,
        engine: 'Google Apps Script Utilities.computeDigest(SHA_256)',
        totalMembers: reports.length,
        verifiedMembers: reports.filter(r => r.parityVerified).length,
        passwordResetsRequired: 0,
        constantTimeEnforced: true,
        reports,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Auth: Test Legacy PIN Verification without Session Creation (Diagnostics / QA)
  router.post('/auth/verify-legacy-test', async (req: AuthenticatedRequest, res) => {
    try {
      const { memberId, pin } = req.body;
      if (!memberId || !pin) {
        return res.status(400).json({ error: 'memberId and pin are required' });
      }
      const member = await membersRepo.getById(memberId);
      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }
      const secrets = await membersRepo.getAuthSecrets(memberId);
      const valid = LegacyAuthService.getInstance().verifyPin(
        pin,
        secrets?.pinHash || '',
        secrets?.pinSalt || '',
        member.Role
      );
      res.json({
        memberId,
        name: member.Display_Name,
        verified: valid,
        algorithm: LegacyAuthService.getInstance().detectAlgorithm(secrets?.pinHash || ''),
        resetsRequired: false,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Family Members
  router.get('/members', async (req: AuthenticatedRequest, res) => {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const members = await membersRepo.getAll();
      if (includeInactive) {
        res.json(members.filter(m => !m.Deleted_At));
      } else {
        res.json(members.filter(m => !m.Deleted_At && m.Status === 'ACTIVE'));
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/members/:memberId', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const member = await membersRepo.getById(req.params.memberId);
      if (!member) {
        return res.status(404).json({ error: 'Member not found' });
      }
      res.json(member);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // OWNER (or self) profile editing endpoint
  router.put('/members/:memberId', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { memberId } = req.params;
      const currentUser = req.userSession!.member;

      const isOwner = currentUser.Role === 'OWNER';
      const isSelf = currentUser.Member_ID === memberId;

      // Access Control: Only the OWNER can edit other family members' profiles.
      // Non-owners can only edit their own cosmetic profile attributes.
      if (!isOwner && !isSelf) {
        return res.status(403).json({
          error: 'FORBIDDEN: Only the family OWNER account is authorized to edit other user profiles.',
        });
      }

      const {
        First_Name,
        Last_Name,
        Display_Name,
        Role,
        Birth_Date,
        Color,
        Avatar_Key,
        Avatar_URL,
        Avatar_Media_ID,
        Status,
        pin,
      } = req.body;

      const updates: any = {};

      if (First_Name !== undefined) updates.First_Name = String(First_Name).trim();
      if (Last_Name !== undefined) updates.Last_Name = String(Last_Name).trim();
      if (Display_Name !== undefined) updates.Display_Name = String(Display_Name).trim();
      if (Birth_Date !== undefined) updates.Birth_Date = String(Birth_Date).trim();
      if (Color !== undefined) updates.Color = String(Color).trim();
      if (Avatar_Key !== undefined) updates.Avatar_Key = String(Avatar_Key).trim();
      if (Avatar_URL !== undefined) updates.Avatar_URL = String(Avatar_URL).trim();
      if (Avatar_Media_ID !== undefined) updates.Avatar_Media_ID = String(Avatar_Media_ID).trim();

      // Role assignment: Only OWNER can change roles (e.g. promoting to ADMIN or assigning OWNER/CHILD)
      if (Role !== undefined) {
        if (!isOwner) {
          return res.status(403).json({
            error: 'FORBIDDEN: Only the OWNER account is permitted to reassign member roles.',
          });
        }
        if (!['OWNER', 'ADMIN', 'CHILD'].includes(Role)) {
          return res.status(400).json({ error: 'Invalid Role specified. Must be OWNER, ADMIN, or CHILD.' });
        }
        updates.Role = Role;
      }

      // Status change: Only OWNER can deactivate or activate family accounts
      if (Status !== undefined) {
        if (!isOwner) {
          return res.status(403).json({
            error: 'FORBIDDEN: Only the OWNER account is permitted to change account active status.',
          });
        }
        if (!['ACTIVE', 'INACTIVE'].includes(Status)) {
          return res.status(400).json({ error: 'Invalid Status specified. Must be ACTIVE or INACTIVE.' });
        }
        updates.Status = Status;
      }

      // PIN reset: OWNER can reset any member's PIN. A member can reset their own PIN.
      if (pin !== undefined && pin !== null && String(pin).trim() !== '') {
        const pinStr = String(pin).trim();
        if (pinStr.length < 4) {
          return res.status(400).json({ error: 'PIN must be at least 4 digits.' });
        }
        updates.pin = pinStr;
      }

      const updatedMember = await membersRepo.updateProfile(memberId, updates);

      // Audit log the profile edit for compliance and transparency
      await auditRepo.logActivity({
        memberId: currentUser.Member_ID,
        action: 'UPDATE_USER_PROFILE',
        entityType: 'FAMILY_MEMBER',
        entityId: memberId,
        details: {
          updatedBy: currentUser.Display_Name,
          updatedByRole: currentUser.Role,
          targetMember: updatedMember.Display_Name,
          fieldsModified: Object.keys(updates),
          hasPinReset: !!updates.pin,
        },
      });

      // Update current session object if self-edited
      if (isSelf && req.userSession) {
        req.userSession.member = updatedMember;
      }

      res.json({
        success: true,
        member: updatedMember,
        message: `Profile for ${updatedMember.Display_Name} updated successfully.`,
      });
    } catch (err: any) {
      console.error('[API] Error updating member profile:', err);
      res.status(500).json({ error: err.message || 'Failed to update member profile' });
    }
  });

  // Events
  router.get('/events', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const role = req.userSession!.member.Role;
      const memberId = req.userSession!.member.Member_ID;
      const isHubLocked = req.userSession!.hubLocked;
      const events = await calendarService.getEvents(role, memberId, isHubLocked);
      res.json(events);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/events', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const memberId = req.userSession!.member.Member_ID;
      const event = await calendarService.createEvent(req.body, memberId);
      res.json(event);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.put('/events/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const memberId = req.userSession!.member.Member_ID;
      await calendarService.updateEvent({ ...req.body, Event_ID: req.params.id }, memberId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.delete('/events/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const memberId = req.userSession!.member.Member_ID;
      await calendarService.deleteEvent(req.params.id, memberId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Tasks
  router.get('/tasks', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const role = req.userSession!.member.Role;
      const memberId = req.userSession!.member.Member_ID;
      const isHubLocked = req.userSession!.hubLocked;
      const tasks = await taskService.getTasks(role, memberId, isHubLocked);
      res.json(tasks);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/tasks', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const memberId = req.userSession!.member.Member_ID;
      await taskService.createTask(req.body, memberId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.patch('/tasks/:id/status', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const role = req.userSession!.member.Role;
      const memberId = req.userSession!.member.Member_ID;
      const { status, note } = req.body;
      const updated = await taskService.updateStatus(req.params.id, status, role, memberId, note);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.get('/tasks/responsibilities', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const assignedTo = req.query.assigned_to as string | undefined;
      const resp = await taskService.getResponsibilities(assignedTo);
      res.json(resp);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/tasks/history', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const taskId = req.query.task_id as string | undefined;
      const memberId = req.query.member_id as string | undefined;
      const history = await taskService.getTaskHistory(taskId, memberId);
      res.json(history);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Lists & Groceries
  router.get('/lists', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const role = req.userSession!.member.Role;
      const memberId = req.userSession!.member.Member_ID;
      const isHubLocked = req.userSession!.hubLocked;
      const lists = await listService.getLists(role, memberId, isHubLocked);
      res.json(lists);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/lists', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const memberId = req.userSession!.member.Member_ID;
      await listService.createList(req.body, memberId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.get('/lists/:id/items', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const items = await listService.getListItems(req.params.id);
      res.json(items);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/lists/:id/items', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const memberId = req.userSession!.member.Member_ID;
      await listService.addItem({ ...req.body, listId: req.params.id }, memberId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.patch('/lists/items/:id/toggle', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const memberId = req.userSession!.member.Member_ID;
      const { completed } = req.body;
      await listService.toggleItem(req.params.id, Boolean(completed), memberId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.delete('/lists/items/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const memberId = req.userSession!.member.Member_ID;
      await listService.deleteItem(req.params.id, memberId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Messages & Chat Threads
  router.get('/messages/threads', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const role = req.userSession!.member.Role;
      const memberId = req.userSession!.member.Member_ID;
      const threads = await messageService.getThreads(role, memberId);
      res.json(threads);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/messages/threads/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const role = req.userSession!.member.Role;
      const memberId = req.userSession!.member.Member_ID;
      const messages = await messageService.getMessages(req.params.id, role, memberId);
      res.json(messages);
    } catch (err: any) {
      res.status(403).json({ error: err.message });
    }
  });

  router.post('/messages/threads/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const memberId = req.userSession!.member.Member_ID;
      const { content, attachmentDriveId, attachmentMime, attachmentName } = req.body;
      if (!content && !attachmentDriveId) {
        return res.status(400).json({ error: 'Message content or attachment required' });
      }

      const msg = await messageService.sendMessage({
        threadId: req.params.id,
        senderId: memberId,
        content: content || '',
        attachmentDriveId,
        attachmentMime,
        attachmentName,
      });

      res.json(msg);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Media: List & Albums
  router.get('/media', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const role = req.userSession!.member.Role;
      const memberId = req.userSession!.member.Member_ID;
      const isHubLocked = req.userSession!.hubLocked;
      const media = await mediaService.getMediaList(role, memberId, isHubLocked);
      res.json(media);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/media/albums', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const role = req.userSession!.member.Role;
      const memberId = req.userSession!.member.Member_ID;
      const isHubLocked = req.userSession!.hubLocked;
      const albums = await mediaService.getAlbums(role, memberId, isHubLocked);
      res.json(albums);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Media: Stream Private File with MIME & Auth (NO Drive credentials exposed)
  router.get('/media/:id', async (req: AuthenticatedRequest, res) => {
    try {
      const memberRole = req.userSession?.member.Role || 'PUBLIC_HUB';
      const memberId = req.userSession?.member.Member_ID || 'anonymous';
      const isHubLocked = req.userSession?.hubLocked ?? true;

      const media = await mediaService.getAuthorizedMedia(req.params.id, memberRole, memberId, isHubLocked);
      const data = await mediaService.streamMediaBytes(media);

      res.setHeader('Content-Type', data.mimeType);
      res.setHeader('Cache-Control', 'private, max-age=3600');

      if (data.buffer) {
        res.send(data.buffer);
      } else if (data.stream) {
        // Stream node response
        const nodeReadable = (data.stream as any);
        nodeReadable.pipe ? nodeReadable.pipe(res) : res.end();
      } else {
        res.status(404).json({ error: 'File content unavailable' });
      }
    } catch (err: any) {
      res.status(403).json({ error: err.message });
    }
  });

  // Media: Upload File (supports Base64 JSON payload with strict MIME & size validation)
  router.post('/media/upload', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const memberId = req.userSession!.member.Member_ID;
      const { fileName, mimeType, base64Data, caption, visibility } = req.body;

      if (!fileName || !mimeType || !base64Data) {
        return res.status(400).json({ error: 'fileName, mimeType, and base64Data are required' });
      }

      const buffer = Buffer.from(base64Data.replace(/^data:.*,/, ''), 'base64');
      const media = await mediaService.uploadMedia({
        fileName,
        mimeType,
        buffer,
        uploadedBy: memberId,
        visibility: visibility || 'FAMILY',
        caption: caption || '',
      });

      res.json(media);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Family Hub: Appliance Data Endpoint
  router.get('/hub/data', async (req: AuthenticatedRequest, res) => {
    try {
      const isParentUnlocked = req.userSession?.isParent && !req.userSession?.hubLocked;
      const parentMemberId = req.userSession?.member.Member_ID;
      const hubData = await hubService.getHubData(isParentUnlocked, parentMemberId);
      res.json(hubData);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Data Versions Polling Endpoint for instant sync
  router.get('/data-versions', (req, res) => {
    res.json(store.getDataVersions());
  });

  // Diagnostics: Owner/Admin Only
  router.get('/diagnostics', requireAuth, requireParent, async (req: AuthenticatedRequest, res) => {
    try {
      const report = await diagnosticsService.runOwnerDiagnostics(req.userSession?.member);
      res.json(report);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Migration: Additive Media Migration (Owner Only)
  router.post('/migration/run-media', requireAuth, requireParent, async (req: AuthenticatedRequest, res) => {
    try {
      const result = await migrationService.runMediaMigration();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
