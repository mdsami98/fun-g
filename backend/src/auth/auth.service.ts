import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { AgenciesService } from '../agencies/agencies.service';
import { UserRole } from '../common/enums/user-role.enum';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly agenciesService: AgenciesService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<{ accessToken: string; user: User }> {
    const agency = await this.agenciesService.findByCode(dto.agencyCode);
    if (!agency || !agency.isActive) {
      throw new BadRequestException('Invalid or inactive agency code');
    }

    const existing = await this.usersService.findByPhone(dto.phone);
    if (existing) {
      throw new ConflictException('Phone number already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.usersService.create({
      phone: dto.phone,
      password: passwordHash,
      name: dto.name,
      role: UserRole.USER,
      agencyId: agency.id,
    });
    user.agency = agency;

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
      throw new UnauthorizedException('Account is inactive');
    }

    if (user.agency && !user.agency.isActive) {
      throw new UnauthorizedException('Agency is inactive');
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
