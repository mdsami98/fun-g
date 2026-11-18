import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PromoCode } from './entities/promo-code.entity';
import { UserPromoRedemption } from './entities/promo-redemption.entity';
import { User } from '../users/entities/user.entity';
import { DailySpinRecord } from '../daily-spin/entities/daily-spin.entity';
import { PromoCodesService } from './promo-codes.service';
import { PromoCodesController } from './promo-codes.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PromoCode,
      UserPromoRedemption,
      User,
      DailySpinRecord,
    ]),
    NotificationsModule,
    AuthModule,
  ],
  providers: [PromoCodesService],
  controllers: [PromoCodesController],
  exports: [PromoCodesService],
})
export class PromoCodesModule {}
