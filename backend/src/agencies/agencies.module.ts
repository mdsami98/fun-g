import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Agency } from './entities/agency.entity';
import { AgencyWalletNumber } from './entities/agency-wallet-number.entity';
import { AgenciesService } from './agencies.service';
import { AgenciesController } from './agencies.controller';
import { UsersModule } from '../users/users.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Agency, AgencyWalletNumber]),
    UsersModule,
    WalletModule,
  ],
  providers: [AgenciesService],
  controllers: [AgenciesController],
  exports: [AgenciesService],
})
export class AgenciesModule {}
