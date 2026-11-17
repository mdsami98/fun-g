import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DailySpinRecord } from './entities/daily-spin.entity';
import { DailySpinService } from './daily-spin.service';
import { DailySpinController } from './daily-spin.controller';
import { User } from '../users/entities/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DailySpinRecord, User]),
    NotificationsModule,
  ],
  controllers: [DailySpinController],
  providers: [DailySpinService],
  exports: [DailySpinService],
})
export class DailySpinModule {}
