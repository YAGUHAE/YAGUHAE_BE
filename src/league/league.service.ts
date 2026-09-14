import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bank } from '../bank/entities/bank.entity';
import { ErrorCode } from '../common/enums/error-code.enum';
import { BusinessException } from '../common/exceptions/business.exception';
import { definedFieldsOf } from '../common/utils/defined-fields.util';
import { CreateLeagueDto } from './dto/create-league.dto';
import { LeagueDto } from './dto/league.dto';
import { UpdateLeagueDto } from './dto/update-league.dto';
import { League } from './entities/league.entity';

@Injectable()
export class LeagueService {
  constructor(
    @InjectRepository(League)
    private readonly leagueRepository: Repository<League>,
    // BankModule을 주입하지 않고 리포지토리를 직접 본다. BankModule이 참조 검사
    // 때문에 League를 이미 보고 있어서, 서로 주입하면 순환 의존이 된다.
    @InjectRepository(Bank)
    private readonly bankRepository: Repository<Bank>,
  ) {}

  /** API 명세서 §4 — `GET /leagues` (공개) */
  async findAll(): Promise<{ items: LeagueDto[] }> {
    const leagues = await this.leagueRepository.find({
      relations: { bank: true },
      order: { createdAt: 'DESC' },
    });

    return { items: leagues.map((league) => LeagueDto.from(league)) };
  }

  /** API 명세서 §4 — `GET /leagues/mine` */
  async findMine(hostId: number): Promise<{ items: LeagueDto[] }> {
    const leagues = await this.leagueRepository.find({
      where: { hostId },
      relations: { bank: true },
      order: { createdAt: 'DESC' },
    });

    return { items: leagues.map((league) => LeagueDto.from(league)) };
  }

  /** API 명세서 §4 — `GET /leagues/:id` (공개) */
  async findOne(id: string): Promise<LeagueDto> {
    return LeagueDto.from(await this.findOneOrThrow(id));
  }

  /** API 명세서 §4 — `POST /leagues` */
  async create(hostId: number, dto: CreateLeagueDto): Promise<LeagueDto> {
    await this.assertBankExists(dto.bankId);

    const saved = await this.leagueRepository.save(
      this.leagueRepository.create({
        ...dto,
        hostId,
        intro: dto.intro ?? null,
        bankId: dto.bankId ?? null,
        defaultFees: dto.defaultFees ?? {},
      }),
    );

    // 저장 직후 엔티티에는 bank 관계가 없다. 응답 계약이 bank 객체라 다시 읽는다.
    return LeagueDto.from(await this.findOneOrThrow(saved.id));
  }

  /** API 명세서 §4 — `PATCH /leagues/:id` (소유자만, 가드가 확인) */
  async update(id: string, dto: UpdateLeagueDto): Promise<LeagueDto> {
    const league = await this.findOneOrThrow(id);

    await this.assertBankExists(dto.bankId);

    // 빈 객체가 와도 save는 호출한다 — 응답이 항상 현재 리그여야 한다.
    Object.assign(league, definedFieldsOf(dto));

    await this.leagueRepository.save(league);

    // bankId가 바뀌었으면 관계를 다시 읽어야 응답의 bank가 새 계좌를 가리킨다.
    return LeagueDto.from(await this.findOneOrThrow(id));
  }

  /**
   * 존재하지 않는 계좌를 가리키면 404다.
   *
   * FK가 막아주긴 하지만 그때는 드라이버 오류라 `code`를 붙일 수 없다 —
   * 프론트가 "계좌를 먼저 등록하세요"로 안내하려면 구분되는 코드가 필요하다.
   */
  private async assertBankExists(bankId?: string): Promise<void> {
    if (bankId === undefined) {
      return;
    }

    const exists = await this.bankRepository.exists({ where: { id: bankId } });

    if (!exists) {
      throw new BusinessException(
        ErrorCode.BANK_NOT_FOUND,
        '존재하지 않는 계좌입니다.',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  private async findOneOrThrow(id: string): Promise<League> {
    const league = await this.leagueRepository.findOne({
      where: { id },
      relations: { bank: true },
    });

    if (!league) {
      throw new BusinessException(
        ErrorCode.NOT_FOUND,
        '존재하지 않는 리그입니다.',
        HttpStatus.NOT_FOUND,
      );
    }

    return league;
  }
}
