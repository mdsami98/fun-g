import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UserRestriction } from './entities/user-restriction.entity';
import { UsersService } from './users.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserRestriction])],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
