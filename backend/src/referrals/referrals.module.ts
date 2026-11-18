import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReferralConfig } from './entities/referral-config.entity';
import { ReferralHistory } from './entities/referral-history.entity';
import { User } from '../users/entities/user.entity';
import { Agency } from '../agencies/entities/agency.entity';
import { WalletTransaction } from '../wallet/entities/wallet-transaction.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReferralsService } from './referrals.service';
import { ReferralsController } from './referrals.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReferralConfig,
      ReferralHistory,
      User,
      Agency,
      WalletTransaction,
    ]),
    NotificationsModule,
  ],
  controllers: [ReferralsController],
  providers: [ReferralsService],
  exports: [ReferralsService],
})
export class ReferralsModule {}
