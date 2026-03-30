import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('youcanpay_logs')
export class YouCanPayLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 50 })
  action: string;

  @Column({ type: 'jsonb' })
  request: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  response: Record<string, unknown> | null;

  @Index()
  @Column({ type: 'varchar', length: 20 })
  status: string;

  @Column({ name: 'duration_ms', type: 'int', nullable: true })
  durationMs: number | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
