import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserRestriction } from './entities/user-restriction.entity';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(UserRestriction)
    private readonly userRestrictionsRepository: Repository<UserRestriction>,
  ) {}

  findByPhone(phone: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { phone },
      relations: { agency: true },
    });
  }

  findById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id },
      relations: { agency: true },
    });
  }

  async create(data: {
    phone: string;
    password: string;
    name: string;
    role: UserRole;
    agencyId?: string | null;
  }): Promise<User> {
    const user = this.usersRepository.create(data);
    return this.usersRepository.save(user);
  }

  async findByAgency(agencyId: string): Promise<User[]> {
    return this.usersRepository.find({
      where: { agencyId, role: UserRole.USER },
      order: { createdAt: 'DESC' },
    });
  }

  findRestrictionsByUser(userId: string): Promise<UserRestriction[]> {
    return this.userRestrictionsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async addRestriction(userId: string, message: string): Promise<UserRestriction> {
    const restriction = this.userRestrictionsRepository.create({ userId, message });
    return this.userRestrictionsRepository.save(restriction);
  }

  findRestrictionById(id: string): Promise<UserRestriction | null> {
    return this.userRestrictionsRepository.findOne({ where: { id } });
  }

  async updateRestriction(id: string, message: string): Promise<UserRestriction> {
    await this.userRestrictionsRepository.update({ id }, { message });
    return (await this.findRestrictionById(id))!;
  }

  async deleteRestriction(id: string): Promise<void> {
    await this.userRestrictionsRepository.delete({ id });
  }
}
