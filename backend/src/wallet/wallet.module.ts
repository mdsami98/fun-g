import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepositRequest } from './entities/deposit-request.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import { AgencyWalletNumber } from '../agencies/entities/agency-wallet-number.entity';
import { Agency } from '../agencies/entities/agency.entity';
import { User } from '../users/entities/user.entity';
import { UserRestriction } from '../users/entities/user-restriction.entity';
import { UserWithdrawalAccount } from './entities/user-withdrawal-account.entity';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DepositRequest,
      WalletTransaction,
      AgencyWalletNumber,
      Agency,
      User,
      UserRestriction,
      UserWithdrawalAccount,
    ]),
    NotificationsModule,
  ],
  providers: [WalletService],
  controllers: [WalletController],
  exports: [WalletService],
})
export class WalletModule {}
