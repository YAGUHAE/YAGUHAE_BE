import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorCode } from '../common/enums/error-code.enum';
import { BusinessException } from '../common/exceptions/business.exception';
import { definedFieldsOf } from '../common/utils/defined-fields.util';
import { League } from '../league/entities/league.entity';
import { BankDto } from './dto/bank.dto';
import { CreateBankDto } from './dto/create-bank.dto';
import { UpdateBankDto } from './dto/update-bank.dto';
import { Bank } from './entities/bank.entity';

@Injectable()
export class BankService {
  constructor(
    @InjectRepository(Bank)
    private readonly bankRepository: Repository<Bank>,
    // TODO: LeagueModule이 생기면 LeagueService 주입으로 교체한다.
    // 삭제 전 참조 검사(API 명세서 §3) 때문에 지금은 리포지토리를 직접 본다.
    @InjectRepository(League)
    private readonly leagueRepository: Repository<League>,
  ) {}

  /**
   * API 명세서 §3 — `GET /banks`
   *
   * 소유자 필터가 없다. `banks`에 `host_id`를 두지 않기로 확정했기 때문이며
   * (계좌 명의자가 주최자 본인이 아닐 수 있다 — ERD §2.3), "내 계좌만"을
   * 만들 근거가 스키마에 없다.
   */
  async findAll(): Promise<{ items: BankDto[] }> {
    const banks = await this.bankRepository.find({
      order: { createdAt: 'DESC' },
    });

    return { items: banks.map((bank) => BankDto.from(bank)) };
  }

  /** API 명세서 §3 — `POST /banks` */
  async create(dto: CreateBankDto): Promise<BankDto> {
    const bank = await this.bankRepository.save(
      this.bankRepository.create(dto),
    );

    return BankDto.from(bank);
  }

  /** API 명세서 §3 — `PATCH /banks/:id` */
  async update(id: string, dto: UpdateBankDto): Promise<BankDto> {
    const bank = await this.findOneOrThrow(id);

    // 빈 객체가 와도 save는 호출한다 — 응답이 항상 현재 계좌여야 한다.
    Object.assign(bank, definedFieldsOf(dto));

    return BankDto.from(await this.bankRepository.save(bank));
  }

  /**
   * API 명세서 §3 — `DELETE /banks/:id`
   *
   * 참조 중인 리그가 있으면 409다. 리그가 계좌를 잃으면 신청자에게 입금할 곳을
   * 안내할 수 없고, `leagues.bank_id`는 nullable이라 DB가 대신 막아주지도 않는다
   * (FK가 ON DELETE SET NULL이었다면 조용히 끊겼을 자리다).
   */
  async remove(id: string): Promise<void> {
    const bank = await this.findOneOrThrow(id);

    await this.assertNotInUse(bank.id);

    try {
      await this.bankRepository.delete(bank.id);
    } catch (error) {
      // 검사와 삭제 사이에 리그가 이 계좌를 참조했다면 FK가 막는다.
      // 원인이 그것이면 위와 같은 409로 돌려준다.
      await this.assertNotInUse(bank.id);
      throw error;
    }
  }

  private async assertNotInUse(bankId: string): Promise<void> {
    const referencing = await this.leagueRepository.count({
      where: { bankId },
    });

    if (referencing > 0) {
      throw new BusinessException(
        ErrorCode.BANK_IN_USE,
        '이 계좌를 사용 중인 리그가 있어 삭제할 수 없습니다.',
        HttpStatus.CONFLICT,
        { leagueCount: referencing },
      );
    }
  }

  private async findOneOrThrow(id: string): Promise<Bank> {
    const bank = await this.bankRepository.findOne({ where: { id } });

    if (!bank) {
      throw new BusinessException(
        ErrorCode.NOT_FOUND,
        '존재하지 않는 계좌입니다.',
        HttpStatus.NOT_FOUND,
      );
    }

    return bank;
  }
}
