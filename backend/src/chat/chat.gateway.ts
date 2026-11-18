import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
import { AuthenticatedUser, JwtPayload } from '../auth/strategies/jwt.strategy';

@WebSocketGateway({ cors: { origin: '*' } })
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
  ) {}

  async handleConnection(client: Socket) {
    const token = (client.handshake.auth?.token || client.handshake.query?.token) as string | undefined;
    let user: AuthenticatedUser | null = null;

    if (token) {
      try {
        const payload = this.jwtService.verify<JwtPayload>(token);
        user = { userId: payload.sub, role: payload.role, agencyId: payload.agencyId };
      } catch {
        user = null;
      }
    }

    client.data.user = user;

    if (user) {
      await client.join(`user:${user.userId}`);
      if (user.agencyId) {
        await client.join(`agency:${user.agencyId}`);
      }
    }
  }

  handleDisconnect(_client: Socket) {
    // Socket cleanup handled automatically by Socket.io
  }

  @SubscribeMessage('chat:join_thread')
  async handleJoinThread(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { threadId: string },
  ) {
    if (!data?.threadId) return { success: false, error: 'threadId required' };
    await client.join(`thread:${data.threadId}`);
    return { success: true, threadId: data.threadId };
  }

  @SubscribeMessage('chat:leave_thread')
  async handleLeaveThread(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { threadId: string },
  ) {
    if (!data?.threadId) return { success: false };
    await client.leave(`thread:${data.threadId}`);
    return { success: true };
  }

  @SubscribeMessage('chat:send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { threadId: string; text: string },
  ) {
    const user = client.data.user as AuthenticatedUser | null;
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    try {
      const result = await this.chatService.sendMessage(user, data.threadId, data.text);

      // Broadcast to all participants in this thread room
      this.server.to(`thread:${data.threadId}`).emit('chat:new_message', {
        message: result.message,
        threadId: data.threadId,
      });

      // Broadcast thread update to user and agency personal rooms
      this.server.to(`user:${result.thread.userId}`).emit('chat:thread_updated', result.thread);
      this.server.to(`agency:${result.thread.agencyId}`).emit('chat:thread_updated', result.thread);

      return { success: true, message: result.message };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to send message' };
    }
  }

  @SubscribeMessage('chat:mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { threadId: string },
  ) {
    const user = client.data.user as AuthenticatedUser | null;
    if (!user || !data?.threadId) return { success: false };

    try {
      const updatedThread = await this.chatService.markThreadAsRead(data.threadId, user);
      this.server.to(`thread:${data.threadId}`).emit('chat:read_receipt', {
        threadId: data.threadId,
        readerRole: user.role,
      });
      this.server.to(`user:${updatedThread.userId}`).emit('chat:thread_updated', updatedThread);
      this.server.to(`agency:${updatedThread.agencyId}`).emit('chat:thread_updated', updatedThread);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}
