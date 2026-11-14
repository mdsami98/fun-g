import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Agency } from './entities/agency.entity';
import {
  AgencyWalletNumber,
  WalletAccountType,
} from './entities/agency-wallet-number.entity';
import { UsersService } from '../users/users.service';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateAgencyDto } from './dto/create-agency.dto';
import {
  CreateWalletNumberDto,
  UpdateWalletNumberDto,
} from './dto/wallet-number.dto';

@Injectable()
export class AgenciesService {
  constructor(
    @InjectRepository(Agency)
    private readonly agenciesRepository: Repository<Agency>,
    @InjectRepository(AgencyWalletNumber)
    private readonly walletNumbersRepository: Repository<AgencyWalletNumber>,
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

  findById(id: string): Promise<Agency | null> {
    return this.agenciesRepository.findOne({ where: { id } });
  }

  findByCode(agencyCode: string): Promise<Agency | null> {
    return this.agenciesRepository.findOne({ where: { agencyCode } });
  }

  async findWalletNumbers(agencyId: string): Promise<AgencyWalletNumber[]> {
    const agency = await this.findById(agencyId);
    if (!agency) {
      throw new NotFoundException('Agency not found');
    }

    return this.walletNumbersRepository.find({
      where: { agencyId },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
  }

  async createWalletNumber(
    agencyId: string,
    dto: CreateWalletNumberDto,
  ): Promise<AgencyWalletNumber> {
    const agency = await this.findById(agencyId);
    if (!agency) {
      throw new NotFoundException('Agency not found');
    }

    const walletNumber = this.walletNumbersRepository.create({
      agencyId,
      provider: dto.provider,
      number: dto.number.trim(),
      accountType: dto.accountType ?? WalletAccountType.PERSONAL,
      isActive: dto.isActive ?? true,
    });

    return this.walletNumbersRepository.save(walletNumber);
  }

  async updateWalletNumber(
    agencyId: string,
    id: string,
    dto: UpdateWalletNumberDto,
  ): Promise<AgencyWalletNumber> {
    const walletNumber = await this.walletNumbersRepository.findOne({
      where: { id, agencyId },
    });
    if (!walletNumber) {
      throw new NotFoundException('Wallet number not found');
    }

    if (dto.provider !== undefined) {
      walletNumber.provider = dto.provider;
    }
    if (dto.number !== undefined) {
      walletNumber.number = dto.number.trim();
    }
    if (dto.accountType !== undefined) {
      walletNumber.accountType = dto.accountType;
    }
    if (dto.isActive !== undefined) {
      walletNumber.isActive = dto.isActive;
    }

    return this.walletNumbersRepository.save(walletNumber);
  }

  async deleteWalletNumber(
    agencyId: string,
    id: string,
  ): Promise<{ success: boolean; id: string }> {
    const walletNumber = await this.walletNumbersRepository.findOne({
      where: { id, agencyId },
    });
    if (!walletNumber) {
      throw new NotFoundException('Wallet number not found');
    }

    await this.walletNumbersRepository.remove(walletNumber);
    return { success: true, id };
  }

  async syncWalletNumbers(
    agencyId: string,
    items: UpdateWalletNumberDto[],
  ): Promise<AgencyWalletNumber[]> {
    const agency = await this.findById(agencyId);
    if (!agency) {
      throw new NotFoundException('Agency not found');
    }

    const existing = await this.walletNumbersRepository.find({
      where: { agencyId },
    });
    const existingMap = new Map(existing.map((item) => [String(item.id), item]));

    const retainedIds = new Set<string>();

    for (const item of items) {
      const stringId = item.id ? String(item.id) : undefined;
      if (stringId && existingMap.has(stringId)) {
        retainedIds.add(stringId);
        const entity = existingMap.get(stringId)!;
        if (item.provider !== undefined) entity.provider = item.provider;
        if (item.number !== undefined) entity.number = item.number.trim();
        if (item.accountType !== undefined) entity.accountType = item.accountType;
        if (item.isActive !== undefined) entity.isActive = item.isActive;
        await this.walletNumbersRepository.save(entity);
      } else {
        const newEntity = this.walletNumbersRepository.create({
          agencyId,
          provider: item.provider!,
          number: (item.number ?? '').trim(),
          accountType: item.accountType ?? WalletAccountType.PERSONAL,
          isActive: item.isActive !== undefined ? item.isActive : true,
        });
        const saved = await this.walletNumbersRepository.save(newEntity);
        retainedIds.add(String(saved.id));
      }
    }

    const toDelete = existing.filter((item) => !retainedIds.has(String(item.id)));
    if (toDelete.length > 0) {
      await this.walletNumbersRepository.remove(toDelete);
    }

    return this.walletNumbersRepository.find({
      where: { agencyId },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
  }

  async getAgencyUsers(agencyId: string) {
    return this.usersService.findByAgency(agencyId);
  }

  private async getAgencyUserOrFail(agencyId: string, userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user || user.agencyId !== agencyId) {
      throw new NotFoundException('User not found in this agency');
    }
    return user;
  }

  async getUserRestrictions(agencyId: string, userId: string) {
    await this.getAgencyUserOrFail(agencyId, userId);
    return this.usersService.findRestrictionsByUser(userId);
  }

  async addUserRestriction(agencyId: string, userId: string, message: string) {
    await this.getAgencyUserOrFail(agencyId, userId);
    return this.usersService.addRestriction(userId, message);
  }

  private async getUserRestrictionOrFail(
    agencyId: string,
    userId: string,
    restrictionId: string,
  ) {
    await this.getAgencyUserOrFail(agencyId, userId);
    const restriction = await this.usersService.findRestrictionById(restrictionId);
    if (!restriction || restriction.userId !== userId) {
      throw new NotFoundException('Restriction not found for this player');
    }
    return restriction;
  }

  async updateUserRestriction(
    agencyId: string,
    userId: string,
    restrictionId: string,
    message: string,
  ) {
    await this.getUserRestrictionOrFail(agencyId, userId, restrictionId);
    return this.usersService.updateRestriction(restrictionId, message);
  }

  async deleteUserRestriction(agencyId: string, userId: string, restrictionId: string) {
    await this.getUserRestrictionOrFail(agencyId, userId, restrictionId);
    await this.usersService.deleteRestriction(restrictionId);
    return { success: true, id: restrictionId };
  }
}
