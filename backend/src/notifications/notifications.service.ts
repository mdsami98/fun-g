import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  /** Create an in-app notification for a user */
  async createNotification(
    userId: string,
    title: string,
    message: string,
    type: NotificationType = NotificationType.SYSTEM,
    data?: Record<string, any>,
    manager?: EntityManager,
  ): Promise<Notification> {
    const repo = manager ? manager.getRepository(Notification) : this.notificationRepo;
    const notification = repo.create({
      userId,
      title,
      message,
      type,
      data: data ?? null,
      isRead: false,
    });
    return repo.save(notification);
  }

  /** Retrieve recent notifications for player */
  async getUserNotifications(userId: string, limit = 30) {
    const [items, unreadCount] = await Promise.all([
      this.notificationRepo.find({
        where: { userId },
        order: { createdAt: 'DESC' },
        take: limit,
      }),
      this.notificationRepo.count({
        where: { userId, isRead: false },
      }),
    ]);

    return {
      items,
      unreadCount,
    };
  }

  /** Mark a specific notification as read */
  async markAsRead(userId: string, notificationId: string): Promise<Notification> {
    const notification = await this.notificationRepo.findOne({
      where: { id: notificationId, userId },
    });
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    notification.isRead = true;
    return this.notificationRepo.save(notification);
  }

  /** Mark all unread notifications as read for player */
  async markAllAsRead(userId: string): Promise<{ success: boolean }> {
    await this.notificationRepo.update({ userId, isRead: false }, { isRead: true });
    return { success: true };
  }
}
