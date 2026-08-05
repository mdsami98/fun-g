import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Agency } from './entities/agency.entity';
import { UsersService } from '../users/users.service';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateAgencyDto } from './dto/create-agency.dto';

@Injectable()
export class AgenciesService {
  constructor(
    @InjectRepository(Agency)
    private readonly agenciesRepository: Repository<Agency>,
    private readonly usersService: UsersService,
  ) {}

  async create(dto: CreateAgencyDto) {
    const existingAgency = await this.agenciesRepository.findOne({
      where: { agencyCode: dto.agencyCode },
    });
    if (existingAgency) {
      throw new ConflictException('Agency code already in use');
    }

    const existingAdmin = await this.usersService.findByPhone(dto.adminPhone);
    if (existingAdmin) {
      throw new ConflictException('Phone number already registered');
    }

    const agency = await this.agenciesRepository.save(
      this.agenciesRepository.create({
        name: dto.name,
        agencyCode: dto.agencyCode,
        bkashNumber: dto.bkashNumber,
      }),
    );

    const passwordHash = await bcrypt.hash(dto.adminPassword, 10);
    const admin = await this.usersService.create({
      phone: dto.adminPhone,
      password: passwordHash,
      name: dto.adminName,
      role: UserRole.AGENCY_ADMIN,
      agencyId: agency.id,
    });

    return { agency, admin };
  }

  findAll(): Promise<Agency[]> {
    return this.agenciesRepository.find();
  }

  findByCode(agencyCode: string): Promise<Agency | null> {
    return this.agenciesRepository.findOne({ where: { agencyCode } });
  }
}
