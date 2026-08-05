import 'reflect-metadata';
import * as bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import dataSource from '../data-source';
import { User } from '../../users/entities/user.entity';
import { UserRole } from '../../common/enums/user-role.enum';

dotenv.config();

async function seedSuperAdmin() {
  const phone = process.env.SEED_SUPER_ADMIN_PHONE;
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD;
  const name = process.env.SEED_SUPER_ADMIN_NAME ?? 'Super Admin';

  if (!phone || !password) {
    throw new Error(
      'SEED_SUPER_ADMIN_PHONE and SEED_SUPER_ADMIN_PASSWORD must be set',
    );
  }

  await dataSource.initialize();
  const usersRepository = dataSource.getRepository(User);

  const existing = await usersRepository.findOne({ where: { phone } });
  if (existing) {
    console.log(`Super admin with phone ${phone} already exists. Skipping.`);
    await dataSource.destroy();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await usersRepository.save(
    usersRepository.create({
      phone,
      password: passwordHash,
      name,
      role: UserRole.SUPER_ADMIN,
      agencyId: null,
    }),
  );

  console.log(`Super admin created with phone ${phone}`);
  await dataSource.destroy();
}

seedSuperAdmin().catch((error) => {
  console.error('Failed to seed super admin:', error);
  process.exit(1);
});
