import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

@Controller('chat')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /** Player retrieves or starts their support thread */
  @Get('my-thread')
  @Roles(UserRole.USER)
  getMyThread(@CurrentUser() user: AuthenticatedUser) {
    return this.chatService.getOrCreateUserThread(user.userId);
  }

  /** Gets message history for a specific thread */
  @Get('threads/:threadId/messages')
  getThreadMessages(
    @Param('threadId') threadId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.chatService.getThreadMessages(
      threadId,
      limit ? Math.min(100, Number(limit)) : 50,
      offset ? Number(offset) : 0,
    );
  }

  /** REST fallback to send a message */
  @Post('threads/:threadId/messages')
  sendMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('threadId') threadId: string,
    @Body('text') text: string,
  ) {
    return this.chatService.sendMessage(user, threadId, text);
  }

  /** Marks a thread's messages as read */
  @Patch('threads/:threadId/read')
  markAsRead(
    @CurrentUser() user: AuthenticatedUser,
    @Param('threadId') threadId: string,
  ) {
    return this.chatService.markThreadAsRead(threadId, user);
  }

  /** Agency Admin lists all player support threads */
  @Get('agency/threads')
  @Roles(UserRole.AGENCY_ADMIN, UserRole.SUPER_ADMIN)
  getAgencyThreads(@CurrentUser() user: AuthenticatedUser) {
    return this.chatService.getAgencyThreads(user.agencyId || '');
  }
}
