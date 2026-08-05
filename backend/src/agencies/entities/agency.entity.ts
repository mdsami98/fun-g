import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('agencies')
export class Agency {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  agencyCode: string;

  @Column({ nullable: true })
  bkashNumber: string;

  @Column('decimal', { precision: 10, scale: 2, default: 40 })
  withdrawalChargeRate: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => User, (user) => user.agency)
  users: User[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
