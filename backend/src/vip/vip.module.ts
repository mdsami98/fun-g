import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VipClaimRecord } from './entities/vip-claim.entity';
import { VipService } from './vip.service';
import { VipController } from './vip.controller';
import { User } from '../users/entities/user.entity';
import { DepositRequest } from '../wallet/entities/deposit-request.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([VipClaimRecord, User, DepositRequest]),
    NotificationsModule,
  ],
  controllers: [VipController],
  providers: [VipService],
  exports: [VipService],
})
export class VipModule {}
