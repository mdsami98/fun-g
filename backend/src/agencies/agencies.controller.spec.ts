import { ForbiddenException } from '@nestjs/common';
import { AgenciesController } from './agencies.controller';
import { UserRole } from '../common/enums/user-role.enum';

describe('AgenciesController', () => {
  let controller: AgenciesController;
  let service: any;
  let walletService: any;

  beforeEach(() => {
    service = {
      findWalletNumbers: jest.fn().mockResolvedValue([]),
      createWalletNumber: jest.fn().mockResolvedValue({ id: '1' }),
      updateWalletNumber: jest.fn().mockResolvedValue({ id: '1' }),
      deleteWalletNumber: jest.fn().mockResolvedValue({ success: true, id: '1' }),
      syncWalletNumbers: jest.fn().mockResolvedValue([]),
    };
    walletService = {
      getAgencyDepositRequests: jest.fn().mockResolvedValue([]),
      getAgencyDepositStats: jest.fn().mockResolvedValue({ pendingCount: 0 }),
      approveDepositRequest: jest.fn().mockResolvedValue({ success: true }),
      rejectDepositRequest: jest.fn().mockResolvedValue({ success: true }),
    };
    controller = new AgenciesController(service, walletService);
  });

  describe('access control', () => {
    it('allows super admin to access any agency wallet numbers', async () => {
      const user = { userId: 'u1', role: UserRole.SUPER_ADMIN, agencyId: null };
      await expect(controller.getWalletNumbers('agency-1', user)).resolves.toEqual([]);
      expect(service.findWalletNumbers).toHaveBeenCalledWith('agency-1');
    });

    it('allows agency admin to access own agency wallet numbers', async () => {
      const user = { userId: 'u2', role: UserRole.AGENCY_ADMIN, agencyId: 'agency-1' };
      await expect(controller.getWalletNumbers('agency-1', user)).resolves.toEqual([]);
      expect(service.findWalletNumbers).toHaveBeenCalledWith('agency-1');
    });

    it('denies agency admin from accessing another agency wallet numbers', async () => {
      const user = { userId: 'u2', role: UserRole.AGENCY_ADMIN, agencyId: 'agency-1' };
      expect(() => controller.getWalletNumbers('agency-2', user)).toThrow(
        ForbiddenException,
      );
    });

    it('denies normal user from accessing wallet numbers', async () => {
      const user = { userId: 'u3', role: UserRole.USER, agencyId: 'agency-1' };
      expect(() => controller.getWalletNumbers('agency-1', user)).toThrow(
        ForbiddenException,
      );
    });
  });
});
