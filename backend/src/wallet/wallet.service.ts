import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import Decimal from 'decimal.js';
import * as bcrypt from 'bcryptjs';
import {
  DepositRequest,
  DepositRequestStatus,
  WalletRequestType,
} from './entities/deposit-request.entity';
import { WalletTransaction } from './entities/wallet-transaction.entity';
import {
  AgencyWalletNumber,
  WalletProvider,
} from '../agencies/entities/agency-wallet-number.entity';
import { Agency } from '../agencies/entities/agency.entity';
import { User } from '../users/entities/user.entity';
import { UserRestriction } from '../users/entities/user-restriction.entity';
import { UserWithdrawalAccount } from './entities/user-withdrawal-account.entity';
import { CreateDepositDto } from './dto/wallet.dto';
import { SetupWithdrawalAccountDto, SubmitWithdrawalDto } from './dto/withdrawal-setup.dto';
import { AddBalanceDto } from './dto/add-balance.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(DepositRequest)
    private readonly depositRequestsRepository: Repository<DepositRequest>,
    @InjectRepository(WalletTransaction)
    private readonly walletTransactionsRepository: Repository<WalletTransaction>,
    @InjectRepository(AgencyWalletNumber)
    private readonly walletNumbersRepository: Repository<AgencyWalletNumber>,
    @InjectRepository(Agency)
    private readonly agenciesRepository: Repository<Agency>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(UserRestriction)
    private readonly userRestrictionsRepository: Repository<UserRestriction>,
    @InjectRepository(UserWithdrawalAccount)
    private readonly withdrawalAccountsRepository: Repository<UserWithdrawalAccount>,
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  async getDepositMethods(agencyId: string | null): Promise<AgencyWalletNumber[]> {
    if (!agencyId) {
      return [];
    }

    return this.walletNumbersRepository.find({
      where: { agencyId, isActive: true },
      order: { id: 'ASC' },
    });
  }

  async createDepositRequest(
    userId: string,
    agencyId: string | null,
    dto: CreateDepositDto,
  ): Promise<DepositRequest> {
    if (!agencyId) {
      throw new BadRequestException('Your account is not linked to an active agency');
    }

    const agency = await this.agenciesRepository.findOne({
      where: { id: agencyId },
    });
    if (!agency || !agency.isActive) {
      throw new BadRequestException('Your agency is inactive or not found');
    }

    let walletNumber: AgencyWalletNumber | null = null;
    if (dto.walletNumberId) {
      walletNumber = await this.walletNumbersRepository.findOne({
        where: { id: dto.walletNumberId, agencyId, isActive: true },
      });
    }

    if (!walletNumber) {
      walletNumber = await this.walletNumbersRepository.findOne({
        where: { agencyId, provider: dto.provider, isActive: true },
      });
    }

    if (!walletNumber) {
      throw new BadRequestException(
        `Your agency does not have an active payment number for ${dto.provider.toUpperCase()}`,
      );
    }

    const request = this.depositRequestsRepository.create({
      userId,
      agencyId,
      walletNumberId: walletNumber.id,
      provider: dto.provider,
      amount: Number(dto.amount).toFixed(2),
      transactionId: dto.transactionId.trim().toUpperCase(),
      status: DepositRequestStatus.PENDING,
      type: WalletRequestType.DEPOSIT,
    });

    return this.depositRequestsRepository.save(request);
  }

  async getUserRequests(userId: string): Promise<DepositRequest[]> {
    return this.depositRequestsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getAgencyDepositRequests(
    agencyId: string,
    status?: DepositRequestStatus,
  ): Promise<DepositRequest[]> {
    const where: any = { agencyId };
    if (status) {
      where.status = status;
    }

    return this.depositRequestsRepository.find({
      where,
      relations: {
        user: true,
        walletNumber: true,
        reviewedBy: true,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async getAgencyDepositStats(agencyId: string) {
    const pendingCount = await this.depositRequestsRepository.count({
      where: { agencyId, status: DepositRequestStatus.PENDING },
    });
    const approvedCount = await this.depositRequestsRepository.count({
      where: { agencyId, status: DepositRequestStatus.APPROVED },
    });
    const rejectedCount = await this.depositRequestsRepository.count({
      where: { agencyId, status: DepositRequestStatus.REJECTED },
    });

    return {
      pendingCount,
      approvedCount,
      rejectedCount,
    };
  }

  async approveDepositRequest(
    adminId: string,
    agencyId: string,
    requestId: string,
  ): Promise<{ success: boolean; request: DepositRequest; balance: string }> {
    return this.dataSource.transaction(async (manager) => {
      const request = await manager.findOne(DepositRequest, {
        where: { id: requestId, agencyId },
      });

      if (!request) {
        throw new NotFoundException('Deposit request not found');
      }

      if (request.status !== DepositRequestStatus.PENDING) {
        throw new BadRequestException('Deposit request has already been processed');
      }

      const user = await manager.findOne(User, {
        where: { id: request.userId },
      });

      if (!user) {
        throw new NotFoundException('User for this deposit request not found');
      }

      const balanceBefore = new Decimal(user.balance || 0);
      const depositAmount = new Decimal(request.amount);
      const balanceAfter = balanceBefore.plus(depositAmount);

      user.balance = balanceAfter.toFixed(2);
      await manager.save(User, user);

      request.status = DepositRequestStatus.APPROVED;
      request.reviewedById = adminId;
      request.reviewedAt = new Date();
      const savedRequest = await manager.save(DepositRequest, request);

      const historyRecord = manager.create(WalletTransaction, {
        userId: request.userId,
        agencyId: request.agencyId,
        type: request.type || WalletRequestType.DEPOSIT,
        amount: request.amount,
        balanceBefore: balanceBefore.toFixed(2),
        balanceAfter: balanceAfter.toFixed(2),
        provider: request.provider,
        transactionId: request.transactionId,
        requestId: request.id,
      });
      await manager.save(WalletTransaction, historyRecord);

      // Send in-app notification
      await this.notificationsService.createNotification(
        request.userId,
        '✅ ডিপোজিট অনুমোদিত!',
        `আপনার ৳${request.amount} ডিপোজিট সফল হয়েছে এবং ব্যালেন্সে যোগ করা হয়েছে। ট্রানজেকশন আইডি: ${request.transactionId}`,
        NotificationType.DEPOSIT_APPROVED,
        { amount: request.amount, transactionId: request.transactionId },
        manager,
      );

      return {
        success: true,
        request: savedRequest,
        balance: user.balance,
      };
    });
  }

  async rejectDepositRequest(
    adminId: string,
    agencyId: string,
    requestId: string,
  ): Promise<DepositRequest> {
    const request = await this.depositRequestsRepository.findOne({
      where: { id: requestId, agencyId },
    });

    if (!request) {
      throw new NotFoundException('Deposit request not found');
    }

    if (request.status !== DepositRequestStatus.PENDING) {
      throw new BadRequestException('Deposit request has already been processed');
    }

    request.status = DepositRequestStatus.REJECTED;
    request.reviewedById = adminId;
    request.reviewedAt = new Date();

    const saved = await this.depositRequestsRepository.save(request);

    // Send in-app notification
    await this.notificationsService.createNotification(
      request.userId,
      '❌ ডিপোজিট বাতিল হয়েছে',
      `আপনার ৳${request.amount} ডিপোজিট অনুরোধটি বাতিল করা হয়েছে। প্রয়োজনে আপনার এজেন্সির সাথে যোগাযোগ করুন।`,
      NotificationType.DEPOSIT_REJECTED,
      { amount: request.amount, transactionId: request.transactionId },
    );

    return saved;
  }

  async getUserWithdrawalAccounts(userId: string): Promise<UserWithdrawalAccount[]> {
    return this.withdrawalAccountsRepository.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });
  }

  async setupWithdrawalAccount(
    userId: string,
    dto: SetupWithdrawalAccountDto,
  ): Promise<UserWithdrawalAccount> {
    if (dto.withdrawalPassword !== dto.confirmPassword) {
      throw new BadRequestException('পাসওয়ার্ড দুটি মিলছে না (Passwords do not match)');
    }

    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.withdrawalPassword')
      .where('user.id = :userId', { userId })
      .getOne();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.withdrawalPassword) {
      // First time setting withdrawal password
      const salt = await bcrypt.genSalt(10);
      user.withdrawalPassword = await bcrypt.hash(dto.withdrawalPassword, salt);
      await this.usersRepository.save(user);
    } else {
      // Verify existing withdrawal password matches
      const isMatch = await bcrypt.compare(
        dto.withdrawalPassword,
        user.withdrawalPassword,
      );
      if (!isMatch) {
        throw new UnauthorizedException('উত্তোলন পাসওয়ার্ডটি সঠিক নয় (Invalid withdrawal password)');
      }
    }

    let account = await this.withdrawalAccountsRepository.findOne({
      where: { userId, provider: dto.provider },
    });

    if (account) {
      account.accountNumber = dto.accountNumber.trim();
      account.accountGroup = dto.accountGroup || 'E-Wallet';
    } else {
      account = this.withdrawalAccountsRepository.create({
        userId,
        provider: dto.provider,
        accountNumber: dto.accountNumber.trim(),
        accountGroup: dto.accountGroup || 'E-Wallet',
      });
    }

    return this.withdrawalAccountsRepository.save(account);
  }

  async creditUserBalance(
    agencyId: string,
    userId: string,
    dto: AddBalanceDto,
  ): Promise<{ success: boolean; balance: string }> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user || user.agencyId !== agencyId) {
      throw new NotFoundException('User not found in this agency');
    }

    const amountDecimal = new Decimal(dto.amount);

    return this.dataSource.transaction(async (manager) => {
      const lockedUser = await manager.findOne(User, { where: { id: userId } });
      if (!lockedUser) {
        throw new NotFoundException('User not found');
      }

      const balanceBefore = new Decimal(lockedUser.balance || 0);
      const balanceAfter = balanceBefore.plus(amountDecimal);

      lockedUser.balance = balanceAfter.toFixed(2);
      await manager.save(User, lockedUser);

      const txId = `ADM-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const historyRecord = manager.create(WalletTransaction, {
        userId,
        agencyId,
        type: WalletRequestType.ADMIN_CREDIT,
        amount: amountDecimal.toFixed(2),
        balanceBefore: balanceBefore.toFixed(2),
        balanceAfter: balanceAfter.toFixed(2),
        provider: null,
        transactionId: txId,
        requestId: null,
      });
      await manager.save(WalletTransaction, historyRecord);

      return {
        success: true,
        balance: lockedUser.balance,
      };
    });
  }

  async getLatestUserRestriction(userId: string): Promise<UserRestriction | null> {
    return this.userRestrictionsRepository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async createWithdrawalRequest(
    userId: string,
    agencyId: string | null,
    dto: SubmitWithdrawalDto,
  ): Promise<{ success: boolean; request: DepositRequest; balance: string; message: string }> {
    // 1. Check user restriction first
    const latestRestriction = await this.userRestrictionsRepository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    if (latestRestriction) {
      throw new BadRequestException({
        isRestricted: true,
        message: latestRestriction.message,
        error: 'USER_RESTRICTED',
      });
    }

    // 2. Fetch user with withdrawalPassword
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.withdrawalPassword')
      .where('user.id = :userId', { userId })
      .getOne();

    if (!user) {
      throw new NotFoundException('ব্যবহারকারী পাওয়া যায়নি (User not found)');
    }

    if (!user.withdrawalPassword) {
      throw new BadRequestException(
        'অনুগ্রহ করে প্রথমে উত্তোলন পাসওয়ার্ড সেট করুন (Please set up your withdrawal password first)',
      );
    }

    const isMatch = await bcrypt.compare(
      dto.withdrawalPassword,
      user.withdrawalPassword,
    );
    if (!isMatch) {
      throw new UnauthorizedException(
        'উত্তোলন পাসওয়ার্ডটি সঠিক নয় (Invalid withdrawal password)',
      );
    }

    // 3. Validate configured withdrawal account
    const account = await this.withdrawalAccountsRepository.findOne({
      where: { userId, provider: dto.provider },
    });
    if (!account) {
      throw new BadRequestException(
        'অনুগ্রহ করে এই পেমেন্ট মেথডের অ্যাকাউন্ট নম্বর যোগ করুন (Please configure your withdrawal account first)',
      );
    }

    // 4. Validate amount
    const amountDecimal = new Decimal(dto.amount);
    if (amountDecimal.isNaN() || amountDecimal.lte(0)) {
      throw new BadRequestException(
        'সঠিক উত্তোলনের পরিমাণ লিখুন (Invalid withdrawal amount)',
      );
    }

    const targetAgencyId = agencyId || user.agencyId;
    if (!targetAgencyId) {
      throw new BadRequestException('আপনার অ্যাকাউন্ট কোনো সক্রিয় এজেন্সির সাথে যুক্ত নয়');
    }

    // 5. Balance check, deduction and atomic request creation
    return this.dataSource.transaction(async (manager) => {
      const lockedUser = await manager.findOne(User, {
        where: { id: userId },
      });

      if (!lockedUser) {
        throw new NotFoundException('ব্যবহারকারী পাওয়া যায়নি');
      }

      const balanceBefore = new Decimal(lockedUser.balance || 0);
      if (balanceBefore.lt(amountDecimal)) {
        throw new BadRequestException(
          'আপনার অ্যাকাউন্টে পর্যাপ্ত ব্যালেন্স নেই (Insufficient balance)',
        );
      }

      const balanceAfter = balanceBefore.minus(amountDecimal);
      lockedUser.balance = balanceAfter.toFixed(2);
      await manager.save(User, lockedUser);

      const txId = `WTH-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const request = manager.create(DepositRequest, {
        userId,
        agencyId: targetAgencyId,
        walletNumberId: null,
        provider: dto.provider,
        amount: amountDecimal.toFixed(2),
        transactionId: txId,
        status: DepositRequestStatus.PENDING,
        type: WalletRequestType.WITHDRAW,
      });

      const savedRequest = await manager.save(DepositRequest, request);

      const historyRecord = manager.create(WalletTransaction, {
        userId,
        agencyId: targetAgencyId,
        type: WalletRequestType.WITHDRAW,
        amount: amountDecimal.toFixed(2),
        balanceBefore: balanceBefore.toFixed(2),
        balanceAfter: balanceAfter.toFixed(2),
        provider: dto.provider,
        transactionId: txId,
        requestId: savedRequest.id,
      });

      await manager.save(WalletTransaction, historyRecord);

      return {
        success: true,
        request: savedRequest,
        balance: lockedUser.balance,
        message: 'উত্তোলন অনুরোধ সফলভাবে জমা দেওয়া হয়েছে (Withdrawal request submitted successfully)',
      };
    });
  }
}

