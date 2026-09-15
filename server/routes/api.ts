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
import { GoogleSheetsService } from '../services/googleSheetsService';
import { LegacyAuthService } from '../services/legacyAuthService';
import { FamilyMembersRepository } from '../repositories/familyMembersRepository';
import { GoogleSheetsFamilyRepository, GoogleSheetsTasksRepository } from '../repositories/sheetsRepository';
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
  const googleSheetsService = GoogleSheetsService.getInstance();
  const sheetsFamilyRepo = GoogleSheetsFamilyRepository.getInstance();
  const sheetsTasksRepo = GoogleSheetsTasksRepository.getInstance();
  const membersRepo = new FamilyMembersRepository();
  const auditRepo = new AuditRepository();
  const store = SheetStore.getInstance();

  // Auth Middleware
  const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    let sessionId = (req.headers['x-session-id'] as string) || (req.query.session_id as string);
    if (!sessionId && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        sessionId = authHeader.slice(7).trim();
      }
    }
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

  // Auth: /api/auth/me - Authenticated Member Profile from Family_Members Google Sheets tab
  router.get('/auth/me', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const memberId = req.userSession!.memberId;
      const member = await sheetsFamilyRepo.getById(memberId);
      if (!member) {
        return res.status(404).json({
          authenticated: false,
          error: 'MEMBER_NOT_FOUND: Profile not found in Family_Members tab',
        });
      }

      res.json({
        authenticated: true,
        member,
        user: member,
        session: req.userSession,
        role: req.userSession!.role,
        isParent: req.userSession!.isParent,
        source: {
          spreadsheetId: sheetsFamilyRepo.getSpreadsheetId(),
          sheetTab: sheetsFamilyRepo.getTabName(),
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.patch('/auth/me', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const memberId = req.userSession!.memberId;
      const updated = await sheetsFamilyRepo.updateMember(memberId, req.body);
      res.json({
        success: true,
        member: updated,
        user: updated,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
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

  // Family Members: Interfaces with Family_Members Google Sheets tab via GoogleSheetsFamilyRepository
  router.get('/family', async (req: AuthenticatedRequest, res) => {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const role = req.query.role as string | undefined;
      const format = req.query.format as string | undefined;

      const summary = await sheetsFamilyRepo.getFamilySummary();
      let members = summary.members;

      if (!includeInactive) {
        members = members.filter(m => m.Status === 'ACTIVE');
      }
      if (role) {
        members = members.filter(m => m.Role.toUpperCase() === role.toUpperCase());
      }

      if (format === 'array') {
        return res.json(members);
      }

      res.json({
        success: true,
        family: 'Enguerra of NY',
        spreadsheetId: sheetsFamilyRepo.getSpreadsheetId(),
        sheetTab: sheetsFamilyRepo.getTabName(),
        count: members.length,
        summary: {
          total: summary.totalMembers,
          parents: summary.parentsCount,
          children: summary.childrenCount,
          active: summary.activeCount,
        },
        members,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/family/summary', async (req: AuthenticatedRequest, res) => {
    try {
      const summary = await sheetsFamilyRepo.getFamilySummary();
      res.json(summary);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/family/:memberId', async (req: AuthenticatedRequest, res) => {
    try {
      const member = await sheetsFamilyRepo.getById(req.params.memberId);
      if (!member) {
        return res.status(404).json({ error: `Member with ID "${req.params.memberId}" not found in ${sheetsFamilyRepo.getTabName()}` });
      }
      res.json(member);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/family', requireAuth, requireParent, async (req: AuthenticatedRequest, res) => {
    try {
      const { firstName, lastName, displayName, role, birthDate, color, avatarKey, avatarUrl, pin } = req.body;
      if (!firstName || !role || !birthDate) {
        return res.status(400).json({ error: 'Missing required fields: firstName, role, birthDate' });
      }
      const member = await sheetsFamilyRepo.createMember(
        { firstName, lastName, displayName, role, birthDate, color, avatarKey, avatarUrl, pin },
        req.userSession!.memberId
      );
      res.status(201).json({ success: true, member });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.put('/family/:memberId', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { memberId } = req.params;
      const isParent = req.userSession!.isParent;
      const isSelf = req.userSession!.memberId === memberId;

      if (!isParent && !isSelf) {
        return res.status(403).json({ error: 'FORBIDDEN: You can only edit your own profile' });
      }

      const updated = await sheetsFamilyRepo.updateMember(memberId, req.body);
      res.json({ success: true, member: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.patch('/family/:memberId', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { memberId } = req.params;
      const isParent = req.userSession!.isParent;
      const isSelf = req.userSession!.memberId === memberId;

      if (!isParent && !isSelf) {
        return res.status(403).json({ error: 'FORBIDDEN: You can only edit your own profile' });
      }

      const updated = await sheetsFamilyRepo.updateMember(memberId, req.body);
      res.json({ success: true, member: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.delete('/family/:memberId', requireAuth, requireParent, async (req: AuthenticatedRequest, res) => {
    try {
      await sheetsFamilyRepo.deleteMember(req.params.memberId);
      res.json({ success: true, message: `Member ${req.params.memberId} marked inactive in ${sheetsFamilyRepo.getTabName()}` });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Legacy /members alias for backward compatibility
  router.get('/members', async (req: AuthenticatedRequest, res) => {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const members = await sheetsFamilyRepo.getAll({ includeInactive });
      res.json(members);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/members/:memberId', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const member = await sheetsFamilyRepo.getById(req.params.memberId);
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

  // Tasks: Interfaces with Tasks Google Sheets tab via GoogleSheetsTasksRepository
  router.get('/tasks', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const role = req.userSession!.role;
      const memberId = req.userSession!.memberId;
      const isHubLocked = req.userSession!.hubLocked;

      const tasks = await sheetsTasksRepo.getTasks({
        memberRole: role,
        memberId,
        isHubLocked,
        assignedTo: (req.query.assigned_to as string) || (req.query.memberId as string),
        status: req.query.status as string,
        priority: req.query.priority as string,
        category: req.query.category as string,
        includeDeleted: req.query.includeDeleted === 'true',
      });

      if (req.query.format === 'wrapped') {
        return res.json({
          success: true,
          count: tasks.length,
          spreadsheetId: sheetsTasksRepo.getSpreadsheetId(),
          sheetTab: sheetsTasksRepo.getTabName(),
          tasks,
        });
      }

      res.json(tasks);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/tasks/responsibilities', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const assignedTo = req.query.assigned_to as string | undefined;
      const resp = await sheetsTasksRepo.getResponsibilities(assignedTo);
      res.json(resp);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/tasks/responsibilities', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const role = req.userSession!.role;
      if (role !== 'OWNER' && role !== 'ADMIN') {
        return res.status(403).json({ error: 'PERMISSION_DENIED: Only parents can create recurring responsibilities' });
      }
      const memberId = req.userSession!.memberId;
      const resp = await sheetsTasksRepo.createResponsibility({
        title: req.body.title || req.body.Title,
        category: req.body.category || req.body.Category,
        recurrence: req.body.recurrence || req.body.Recurrence,
        assignedTo: req.body.assignedTo || req.body.Assigned_To,
        targetDays: req.body.targetDays || req.body.Target_Days,
        points: req.body.points || req.body.Points,
      }, memberId);
      res.status(201).json({ success: true, responsibility: resp });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.patch('/tasks/responsibilities/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const role = req.userSession!.role;
      if (role !== 'OWNER' && role !== 'ADMIN') {
        return res.status(403).json({ error: 'PERMISSION_DENIED: Only parents can update recurring responsibilities' });
      }
      const memberId = req.userSession!.memberId;
      const updated = await sheetsTasksRepo.updateResponsibility(req.params.id, req.body, memberId);
      res.json({ success: true, responsibility: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.delete('/tasks/responsibilities/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const role = req.userSession!.role;
      if (role !== 'OWNER' && role !== 'ADMIN') {
        return res.status(403).json({ error: 'PERMISSION_DENIED: Only parents can delete recurring responsibilities' });
      }
      const memberId = req.userSession!.memberId;
      await sheetsTasksRepo.deleteResponsibility(req.params.id, memberId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.post('/tasks/responsibilities/:id/complete', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const role = req.userSession!.role;
      const memberId = req.userSession!.memberId;
      const dateStr = req.body.date || new Date().toISOString().split('T')[0];
      const note = req.body.note;
      const task = await sheetsTasksRepo.completeResponsibilityOccurrence(req.params.id, dateStr, role, memberId, note);
      res.json({ success: true, task });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.get('/tasks/history', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const taskId = req.query.task_id as string | undefined;
      const memberId = req.query.member_id as string | undefined;
      const history = await sheetsTasksRepo.getHistory(taskId, memberId);
      res.json(history);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/tasks/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const task = await sheetsTasksRepo.getById(req.params.id);
      if (!task) {
        return res.status(404).json({ error: `Task with ID "${req.params.id}" not found in ${sheetsTasksRepo.getTabName()}` });
      }
      res.json(task);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/tasks', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const memberId = req.userSession!.memberId;
      const task = await sheetsTasksRepo.createTask({
        title: req.body.title || req.body.Title,
        description: req.body.description || req.body.Description,
        dueDate: req.body.dueDate || req.body.Due_Date,
        assignedTo: req.body.assignedTo || req.body.Assigned_To,
        category: req.body.category || req.body.Category,
        priority: req.body.priority || req.body.Priority,
        visibility: req.body.visibility || req.body.Visibility,
        points: req.body.points || req.body.Points,
      }, memberId);
      res.status(201).json({ success: true, task });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.put('/tasks/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const memberId = req.userSession!.memberId;
      const updated = await sheetsTasksRepo.updateTask(req.params.id, req.body, memberId);
      res.json({ success: true, task: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.patch('/tasks/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const memberId = req.userSession!.memberId;
      const updated = await sheetsTasksRepo.updateTask(req.params.id, req.body, memberId);
      res.json({ success: true, task: updated });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.patch('/tasks/:id/status', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const role = req.userSession!.role;
      const memberId = req.userSession!.memberId;
      const { status, note } = req.body;
      const updated = await sheetsTasksRepo.updateStatus(req.params.id, status, role, memberId, note);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  router.delete('/tasks/:id', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const memberId = req.userSession!.memberId;
      await sheetsTasksRepo.deleteTask(req.params.id, memberId);
      res.json({ success: true, message: `Task ${req.params.id} deleted from ${sheetsTasksRepo.getTabName()}` });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
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

  // ============================================================================
  // Google Sheets Service: Member Profiles & Tasks (Configured via .env)
  // ============================================================================

  router.get('/google-sheets/config', (req, res) => {
    const config = googleSheetsService.getConfig();
    res.json(config);
  });

  router.get('/google-sheets/status', async (req, res) => {
    try {
      const status = await googleSheetsService.checkConnection();
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/google-sheets/members', async (req, res) => {
    try {
      const forceLive = req.query.forceLive === 'true';
      const includeDeleted = req.query.includeDeleted === 'true';
      const members = await googleSheetsService.fetchFamilyMembers({ forceLive, includeDeleted });
      res.json({
        success: true,
        count: members.length,
        spreadsheetId: googleSheetsService.getConfig().spreadsheetId,
        sheetTab: googleSheetsService.getConfig().membersTab,
        members,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/google-sheets/tasks', async (req, res) => {
    try {
      const forceLive = req.query.forceLive === 'true';
      const memberId = req.query.memberId as string;
      const includeDeleted = req.query.includeDeleted === 'true';
      const tasks = await googleSheetsService.fetchTasks({ forceLive, memberId, includeDeleted });
      res.json({
        success: true,
        count: tasks.length,
        spreadsheetId: googleSheetsService.getConfig().spreadsheetId,
        sheetTab: googleSheetsService.getConfig().tasksTab,
        tasks,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/google-sheets/lists', async (req, res) => {
    try {
      const forceLive = req.query.forceLive === 'true';
      const includeDeleted = req.query.includeDeleted === 'true';
      const lists = await googleSheetsService.fetchTaskLists({ forceLive, includeDeleted });
      res.json({
        success: true,
        count: lists.length,
        spreadsheetId: googleSheetsService.getConfig().spreadsheetId,
        sheetTab: googleSheetsService.getConfig().listsTab,
        lists,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/google-sheets/all-task-modules', async (req, res) => {
    try {
      const forceLive = req.query.forceLive === 'true';
      const memberId = req.query.memberId as string;
      const data = await googleSheetsService.fetchAllTaskModules({ forceLive, memberId });
      res.json({
        success: true,
        spreadsheetId: googleSheetsService.getConfig().spreadsheetId,
        ...data,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
