import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { AgenciesService } from './agencies.service';
import { Agency } from './entities/agency.entity';
import {
  AgencyWalletNumber,
  WalletAccountType,
  WalletProvider,
} from './entities/agency-wallet-number.entity';
import { UsersService } from '../users/users.service';

describe('AgenciesService - Wallet Numbers', () => {
  let service: AgenciesService;
  let agenciesRepo: any;
  let walletNumbersRepo: any;

  const mockAgency: Agency = {
    id: 'agency-uuid-1',
    name: 'Dhaka Agency',
    agencyCode: 'DHAKA01',
    bkashNumber: '01700000000',
    withdrawalChargeRate: '40',
    isActive: true,
    users: [],
    walletNumbers: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockWalletNumber: AgencyWalletNumber = {
    id: '1',
    agencyId: 'agency-uuid-1',
    agency: mockAgency,
    provider: WalletProvider.BKASH,
    number: '01711111111',
    accountType: WalletAccountType.PERSONAL,
    isActive: true,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    agenciesRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn(),
      find: jest.fn(),
    };

    walletNumbersRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((entity) =>
        Promise.resolve({ id: entity.id ?? '10', ...entity }),
      ),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgenciesService,
        {
          provide: getRepositoryToken(Agency),
          useValue: agenciesRepo,
        },
        {
          provide: getRepositoryToken(AgencyWalletNumber),
          useValue: walletNumbersRepo,
        },
        {
          provide: UsersService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<AgenciesService>(AgenciesService);
  });

  describe('findWalletNumbers', () => {
    it('throws NotFoundException if agency not found', async () => {
      agenciesRepo.findOne.mockResolvedValue(null);
      await expect(service.findWalletNumbers('unknown-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns wallet numbers for an agency', async () => {
      agenciesRepo.findOne.mockResolvedValue(mockAgency);
      walletNumbersRepo.find.mockResolvedValue([mockWalletNumber]);

      const result = await service.findWalletNumbers('agency-uuid-1');
      expect(result).toHaveLength(1);
      expect(result[0].provider).toBe(WalletProvider.BKASH);
      expect(result[0].number).toBe('01711111111');
    });
  });

  describe('createWalletNumber', () => {
    it('creates and saves a new wallet number', async () => {
      agenciesRepo.findOne.mockResolvedValue(mockAgency);

      const result = await service.createWalletNumber('agency-uuid-1', {
        provider: WalletProvider.NAGAD,
        number: '01822222222',
        accountType: WalletAccountType.AGENT,
        isActive: true,
      });

      expect(walletNumbersRepo.create).toHaveBeenCalledWith({
        agencyId: 'agency-uuid-1',
        provider: WalletProvider.NAGAD,
        number: '01822222222',
        accountType: WalletAccountType.AGENT,
        isActive: true,
      });
      expect(result.provider).toBe(WalletProvider.NAGAD);
    });
  });

  describe('updateWalletNumber', () => {
    it('updates an existing wallet number', async () => {
      walletNumbersRepo.findOne.mockResolvedValue({ ...mockWalletNumber });

      const result = await service.updateWalletNumber('agency-uuid-1', '1', {
        provider: WalletProvider.ROCKET,
        number: '01933333333',
        accountType: WalletAccountType.MERCHANT,
        isActive: false,
      });

      expect(result.provider).toBe(WalletProvider.ROCKET);
      expect(result.number).toBe('01933333333');
      expect(result.accountType).toBe(WalletAccountType.MERCHANT);
      expect(result.isActive).toBe(false);
    });

    it('throws NotFoundException if wallet number does not exist', async () => {
      walletNumbersRepo.findOne.mockResolvedValue(null);
      await expect(
        service.updateWalletNumber('agency-uuid-1', '999', {
          number: '01999999999',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteWalletNumber', () => {
    it('deletes the wallet number', async () => {
      walletNumbersRepo.findOne.mockResolvedValue(mockWalletNumber);

      const result = await service.deleteWalletNumber('agency-uuid-1', '1');
      expect(result).toEqual({ success: true, id: '1' });
      expect(walletNumbersRepo.remove).toHaveBeenCalledWith(mockWalletNumber);
    });
  });

  describe('syncWalletNumbers', () => {
    it('synchronizes list: updates existing, creates new, removes missing', async () => {
      agenciesRepo.findOne.mockResolvedValue(mockAgency);
      walletNumbersRepo.find
        .mockResolvedValueOnce([
          { ...mockWalletNumber, id: '1' },
          { ...mockWalletNumber, id: '2', number: '01722222222' },
        ])
        .mockResolvedValueOnce([
          { ...mockWalletNumber, id: '1', number: '01711119999' },
          { ...mockWalletNumber, id: '10', number: '01733333333' },
        ]);

      const result = await service.syncWalletNumbers('agency-uuid-1', [
        {
          id: '1',
          provider: WalletProvider.BKASH,
          number: '01711119999',
          accountType: WalletAccountType.PERSONAL,
          isActive: true,
        },
        {
          provider: WalletProvider.ROCKET,
          number: '01733333333',
          accountType: WalletAccountType.AGENT,
          isActive: true,
        },
      ]);

      // Row '2' should have been removed
      expect(walletNumbersRepo.remove).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });
  });
});
