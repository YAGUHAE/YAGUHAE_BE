import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { League } from '../../league/entities/league.entity';

/**
 * ERD §2.3
 *
 * host_id를 의도적으로 두지 않는다 — 계좌 명의자가 리그 주최자 본인이 아닐 수 있기
 * 때문(예: 회계 담당자 명의). 소유권 검증은 API 레벨에서 RolesGuard('HOST')로 단순화한다.
 */
@Entity('banks')
export class Bank extends BaseEntity {
  @Column({ type: 'text', name: 'bank_name' })
  bankName: string;

  @Column({ type: 'text' })
  account: string;

  @Column({ type: 'text' })
  holder: string;

  @OneToMany(() => League, (league) => league.bank)
  leagues: League[];
}
