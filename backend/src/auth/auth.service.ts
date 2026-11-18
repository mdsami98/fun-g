import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { UsersService } from '../users/users.service';
import { AgenciesService } from '../agencies/agencies.service';
import { ReferralsService } from '../referrals/referrals.service';
import { UserRole } from '../common/enums/user-role.enum';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/entities/user.entity';
import { Agency } from '../agencies/entities/agency.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly agenciesService: AgenciesService,
    private readonly jwtService: JwtService,
    private readonly referralsService: ReferralsService,
    private readonly dataSource: DataSource,
  ) {}

  async register(dto: RegisterDto): Promise<{ accessToken: string; user: User }> {
    let agency: Agency | null = null;

    if (dto.referralCode && dto.referralCode.trim().length > 0) {
      // Validate referral code and auto-assign agency
      const referralInfo = await this.referralsService.validateReferralCode(dto.referralCode);
      agency = referralInfo.agency;
    } else {
      if (!dto.agencyCode || dto.agencyCode.trim().length === 0) {
        throw new BadRequestException('Agency code is required when no referral code is used');
      }
      agency = await this.agenciesService.findByCode(dto.agencyCode);
    }

    if (!agency || !agency.isActive) {
      throw new BadRequestException('Invalid or inactive agency');
    }

    const existing = await this.usersService.findByPhone(dto.phone);
    if (existing) {
      throw new ConflictException('Phone number already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.dataSource.transaction(async (manager) => {
      const newUser = manager.create(User, {
        phone: dto.phone,
        password: passwordHash,
        name: dto.name,
        role: UserRole.USER,
        agencyId: agency.id,
      });
      const savedUser = await manager.save(User, newUser);
      savedUser.agency = agency;

      // If registered with a referral code, process referrer reward
      if (dto.referralCode && dto.referralCode.trim().length > 0) {
        await this.referralsService.processReferralReward(dto.referralCode, savedUser.id, manager);
      }

      // Initialize referral config for the newly created player
      await this.referralsService.ensureUserConfig(savedUser.id, agency.id);

      return savedUser;
    });

    return this.issueToken(user);
  }

  async login(dto: LoginDto): Promise<{ accessToken: string; user: User }> {
    const user = await this.usersService.findByPhone(dto.phone);
    if (!user) {
      throw new UnauthorizedException('Invalid phone number or password');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid phone number or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('আপনার অ্যাকাউন্টটি নিষ্ক্রিয় করা হয়েছে। অনুগ্রহ করে এজেন্সির সাথে যোগাযোগ করুন।');
    }

    if (user.agencyId) {
      const agency = user.agency || (await this.agenciesService.findById(user.agencyId));
      if (agency && !agency.isActive) {
        throw new UnauthorizedException('আপনার এজেন্সিটি বর্তমানে নিষ্ক্রিয় রয়েছে। অনুগ্রহ করে সুপার অ্যাডমিনের সাথে যোগাযোগ করুন।');
      }
    }

    return this.issueToken(user);
  }

  private issueToken(user: User): { accessToken: string; user: User } {
    const accessToken = this.jwtService.sign({
      sub: user.id,
      role: user.role,
      agencyId: user.agencyId,
    });

    return { accessToken, user };
  }
}
