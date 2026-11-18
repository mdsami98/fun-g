import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ChatService } from './chat.service';
import { ChatThread } from './entities/chat-thread.entity';
import { ChatMessage, ChatSenderRole } from './entities/chat-message.entity';
import { User } from '../users/entities/user.entity';
import { Agency } from '../agencies/entities/agency.entity';
import { UserRole } from '../common/enums/user-role.enum';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('ChatService', () => {
  let service: ChatService;
  let threadRepo: any;
  let messageRepo: any;
  let userRepo: any;
  let agencyRepo: any;

  const mockUser: Partial<User> = {
    id: 'user-1',
    agencyId: 'agency-1',
    name: 'Player One',
    phone: '01700000001',
    role: UserRole.USER,
  };

  const mockAgency: Partial<Agency> = {
    id: 'agency-1',
    name: 'Dhaka Agency',
  };

  const mockThread: Partial<ChatThread> = {
    id: 'thread-1',
    userId: 'user-1',
    agencyId: 'agency-1',
    userUnreadCount: 0,
    agencyUnreadCount: 0,
    lastMessage: null,
    lastMessageAt: null,
  };

  beforeEach(async () => {
    threadRepo = {
      findOne: jest.fn(),
      create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 'thread-new' })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      find: jest.fn(),
    };

    messageRepo = {
      create: jest.fn().mockImplementation((dto) => ({ ...dto, id: 'msg-1', createdAt: new Date() })),
      save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
      find: jest.fn(),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    userRepo = {
      findOne: jest.fn(),
      save: jest.fn().mockImplementation((u) => Promise.resolve(u)),
    };

    agencyRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: getRepositoryToken(ChatThread), useValue: threadRepo },
        { provide: getRepositoryToken(ChatMessage), useValue: messageRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Agency), useValue: agencyRepo },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  describe('getOrCreateUserThread', () => {
    it('returns existing thread if present', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      threadRepo.findOne.mockResolvedValue(mockThread);

      const result = await service.getOrCreateUserThread('user-1');
      expect(result).toEqual(mockThread);
      expect(threadRepo.create).not.toHaveBeenCalled();
    });

    it('creates new thread if not existing', async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      threadRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ ...mockThread, id: 'thread-new' });

      const result = await service.getOrCreateUserThread('user-1');
      expect(result.id).toBe('thread-new');
      expect(threadRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', agencyId: 'agency-1' }),
      );
    });

    it('falls back to first available agency if user has none', async () => {
      userRepo.findOne.mockResolvedValue({ ...mockUser, agencyId: null });
      agencyRepo.findOne.mockResolvedValue(mockAgency);
      threadRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ ...mockThread, id: 'thread-new' });

      const result = await service.getOrCreateUserThread('user-1');
      expect(userRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('throws NotFoundException if user does not exist', async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.getOrCreateUserThread('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('sendMessage', () => {
    it('throws if message text is empty', async () => {
      await expect(
        service.sendMessage({ userId: 'user-1', role: UserRole.USER }, 'thread-1', '   '),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows player to send message and increments agency unread counter', async () => {
      threadRepo.findOne.mockResolvedValue({ ...mockThread });

      const result = await service.sendMessage(
        { userId: 'user-1', role: UserRole.USER },
        'thread-1',
        'Hello support!',
      );

      expect(result.message.text).toBe('Hello support!');
      expect(result.message.senderRole).toBe(ChatSenderRole.USER);
      expect(result.thread.agencyUnreadCount).toBe(1);
      expect(result.thread.lastMessage).toBe('Hello support!');
    });

    it('allows agency admin to reply and increments user unread counter', async () => {
      threadRepo.findOne.mockResolvedValue({ ...mockThread });

      const result = await service.sendMessage(
        { userId: 'admin-1', role: UserRole.AGENCY_ADMIN, agencyId: 'agency-1' },
        'thread-1',
        'How can I help you?',
      );

      expect(result.message.text).toBe('How can I help you?');
      expect(result.message.senderRole).toBe(ChatSenderRole.AGENCY_ADMIN);
      expect(result.thread.userUnreadCount).toBe(1);
    });

    it('rejects message if user is not authorized for the thread', async () => {
      threadRepo.findOne.mockResolvedValue({ ...mockThread });

      await expect(
        service.sendMessage({ userId: 'other-user', role: UserRole.USER }, 'thread-1', 'Sneaky'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('markThreadAsRead', () => {
    it('resets user unread counter when read by user', async () => {
      threadRepo.findOne.mockResolvedValue({ ...mockThread, userUnreadCount: 3 });

      const result = await service.markThreadAsRead('thread-1', {
        userId: 'user-1',
        role: UserRole.USER,
      });

      expect(result.userUnreadCount).toBe(0);
      expect(messageRepo.update).toHaveBeenCalledWith(
        { threadId: 'thread-1', senderRole: ChatSenderRole.AGENCY_ADMIN, isRead: false },
        { isRead: true },
      );
    });

    it('resets agency unread counter when read by agency admin', async () => {
      threadRepo.findOne.mockResolvedValue({ ...mockThread, agencyUnreadCount: 5 });

      const result = await service.markThreadAsRead('thread-1', {
        userId: 'admin-1',
        role: UserRole.AGENCY_ADMIN,
        agencyId: 'agency-1',
      });

      expect(result.agencyUnreadCount).toBe(0);
      expect(messageRepo.update).toHaveBeenCalledWith(
        { threadId: 'thread-1', senderRole: ChatSenderRole.USER, isRead: false },
        { isRead: true },
      );
    });
  });

  describe('getAgencyThreads', () => {
    it('returns threads for an agency', async () => {
      threadRepo.find.mockResolvedValue([mockThread]);
      const threads = await service.getAgencyThreads('agency-1');
      expect(threads).toEqual([mockThread]);
      expect(threadRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { agencyId: 'agency-1' } }),
      );
    });
  });
});
