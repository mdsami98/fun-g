import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatThread } from './entities/chat-thread.entity';
import { ChatMessage, ChatSenderRole } from './entities/chat-message.entity';
import { User } from '../users/entities/user.entity';
import { Agency } from '../agencies/entities/agency.entity';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatThread)
    private readonly threadRepo: Repository<ChatThread>,
    @InjectRepository(ChatMessage)
    private readonly messageRepo: Repository<ChatMessage>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Agency)
    private readonly agencyRepo: Repository<Agency>,
  ) {}

  /** Gets or creates the support chat thread for a player and their agency */
  async getOrCreateUserThread(userId: string): Promise<ChatThread> {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: { agency: true },
    });


    if (!user) {
      throw new NotFoundException('User not found');
    }

    let agencyId = user.agencyId;
    if (!agencyId) {
      // Fallback to first available agency if user has none assigned
      const firstAgency = await this.agencyRepo.findOne({
        where: {},
        order: { createdAt: 'ASC' },
      });
      if (!firstAgency) {
        throw new BadRequestException('No agency available to handle customer support');
      }
      agencyId = firstAgency.id;
      user.agencyId = agencyId;
      await this.userRepo.save(user);
    }

    let thread = await this.threadRepo.findOne({
      where: { userId, agencyId },
      relations: { agency: true, user: true },
    });

    if (!thread) {
      thread = this.threadRepo.create({
        userId,
        agencyId,
        userUnreadCount: 0,
        agencyUnreadCount: 0,
      });
      thread = await this.threadRepo.save(thread);

      // Re-fetch with relations
      thread = (await this.threadRepo.findOne({
        where: { id: thread.id },
        relations: { agency: true, user: true },
      })) as ChatThread;
    }

    return thread;
  }

  /** Gets thread by ID with validation */
  async getThreadById(threadId: string): Promise<ChatThread> {
    const thread = await this.threadRepo.findOne({
      where: { id: threadId },
      relations: { agency: true, user: true },
    });

    if (!thread) {
      throw new NotFoundException('Chat thread not found');
    }
    return thread;
  }

  /** Gets recent messages for a thread */
  async getThreadMessages(threadId: string, limit = 50, offset = 0): Promise<ChatMessage[]> {
    return this.messageRepo.find({
      where: { threadId },
      order: { createdAt: 'ASC' },
      take: limit,
      skip: offset,
      relations: { sender: true },
    });

  }

  /** Sends a message in a thread from user or agency admin */
  async sendMessage(
    sender: { userId: string; role: string; agencyId?: string | null },
    threadId: string,
    rawText: string,
  ): Promise<{ message: ChatMessage; thread: ChatThread }> {
    const text = rawText ? rawText.trim() : '';
    if (!text) {
      throw new BadRequestException('Message cannot be empty');
    }

    const thread = await this.getThreadById(threadId);

    const isAgencyAdmin = sender.role === UserRole.AGENCY_ADMIN || sender.role === UserRole.SUPER_ADMIN;

    if (isAgencyAdmin) {
      if (sender.role === UserRole.AGENCY_ADMIN && sender.agencyId && thread.agencyId !== sender.agencyId) {
        throw new ForbiddenException('Not authorized to message in this thread');
      }
    } else {
      if (thread.userId !== sender.userId) {
        throw new ForbiddenException('Not authorized to message in this thread');
      }
    }

    const senderRole = isAgencyAdmin ? ChatSenderRole.AGENCY_ADMIN : ChatSenderRole.USER;

    const message = this.messageRepo.create({
      threadId: thread.id,
      senderId: sender.userId,
      senderRole,
      text,
      isRead: false,
    });
    const savedMessage = await this.messageRepo.save(message);

    // Update thread snippet and unread counter
    thread.lastMessage = text;
    thread.lastMessageAt = savedMessage.createdAt;
    if (isAgencyAdmin) {
      thread.userUnreadCount = (thread.userUnreadCount || 0) + 1;
    } else {
      thread.agencyUnreadCount = (thread.agencyUnreadCount || 0) + 1;
    }
    const updatedThread = await this.threadRepo.save(thread);

    return { message: savedMessage, thread: updatedThread };
  }

  /** Marks all incoming messages in a thread as read */
  async markThreadAsRead(
    threadId: string,
    reader: { userId: string; role: string; agencyId?: string | null },
  ): Promise<ChatThread> {
    const thread = await this.getThreadById(threadId);
    const isAgencyAdmin = reader.role === UserRole.AGENCY_ADMIN || reader.role === UserRole.SUPER_ADMIN;

    if (isAgencyAdmin) {
      if (reader.role === UserRole.AGENCY_ADMIN && reader.agencyId && thread.agencyId !== reader.agencyId) {
        throw new ForbiddenException('Not authorized');
      }
      thread.agencyUnreadCount = 0;
      await this.messageRepo.update(
        { threadId, senderRole: ChatSenderRole.USER, isRead: false },
        { isRead: true },
      );
    } else {
      if (thread.userId !== reader.userId) {
        throw new ForbiddenException('Not authorized');
      }
      thread.userUnreadCount = 0;
      await this.messageRepo.update(
        { threadId, senderRole: ChatSenderRole.AGENCY_ADMIN, isRead: false },
        { isRead: true },
      );
    }

    return this.threadRepo.save(thread);
  }

  /** Lists all player chat threads for an agency, sorted by latest activity */
  async getAgencyThreads(agencyId: string): Promise<ChatThread[]> {
    return this.threadRepo.find({
      where: { agencyId },
      relations: { user: true },
      order: { lastMessageAt: 'DESC' },
    });

  }
}
