import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorCode } from '../common/enums/error-code.enum';
import { BusinessException } from '../common/exceptions/business.exception';
import { Evaluation } from '../evaluation/entities/evaluation.entity';
import { EvaluationSummaryDto } from './dto/evaluation-summary.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { UserDetailDto } from './dto/user-detail.dto';
import { UserProfileDto } from './dto/user-profile.dto';
import { User } from './entities/user.entity';

interface SummaryRow {
  mannerAvg: string | null;
  skillMatchAvg: string | null;
  punctualityAvg: string | null;
  bestPlayerCount: string | null;
}

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    // TODO: EvaluationModule이 생기면 EvaluationService 주입으로 교체한다.
    // 공개 프로필의 evaluationSummary(API 명세서 §2) 때문에 지금은 직접 본다.
    @InjectRepository(Evaluation)
    private readonly evaluationRepository: Repository<Evaluation>,
  ) {}

  /** API 명세서 §2 — `GET /users/me` */
  async findMe(userId: string): Promise<UserDetailDto> {
    return UserDetailDto.from(await this.findOneOrThrow(userId));
  }

  /** API 명세서 §2 — `PATCH /users/me` */
  async updateMe(userId: string, dto: UpdateMeDto): Promise<UserDetailDto> {
    const user = await this.findOneOrThrow(userId);

    // 빈 객체가 와도 save는 호출한다 — 응답이 항상 현재 프로필이어야 한다.
    Object.assign(user, definedFieldsOf(dto));

    return UserDetailDto.from(await this.userRepository.save(user));
  }

  /** API 명세서 §2 — `GET /users/:id` (선수 카드) */
  async findProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.findOneOrThrow(userId);

    return UserProfileDto.from(user, await this.summarize(userId));
  }

  private async findOneOrThrow(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new BusinessException(
        ErrorCode.NOT_FOUND,
        '존재하지 않는 사용자입니다.',
        HttpStatus.NOT_FOUND,
      );
    }

    return user;
  }

  /**
   * 평가 집계.
   *
   * 엔티티를 전부 불러와 애플리케이션에서 평균을 내면 평가가 쌓일수록
   * 선수 카드 한 장에 수백 행이 실려 온다. 집계는 DB가 한다.
   *
   * 평가가 없으면 AVG가 NULL이므로 0으로 떨어뜨린다 — 프론트가 null 분기를
   * 하지 않아도 되게 하고, "평가 없음"은 별점 0으로 표시된다.
   */
  private async summarize(userId: string): Promise<EvaluationSummaryDto> {
    const row = await this.evaluationRepository
      .createQueryBuilder('evaluation')
      .select('AVG(evaluation.mannerScore)', 'mannerAvg')
      .addSelect('AVG(evaluation.skillMatchScore)', 'skillMatchAvg')
      .addSelect('AVG(evaluation.punctualityScore)', 'punctualityAvg')
      .addSelect(
        'COUNT(*) FILTER (WHERE evaluation.isBestPlayer)',
        'bestPlayerCount',
      )
      .where('evaluation.evaluateeId = :userId', { userId })
      .getRawOne<SummaryRow>();

    return {
      mannerAvg: round(row?.mannerAvg),
      skillMatchAvg: round(row?.skillMatchAvg),
      punctualityAvg: round(row?.punctualityAvg),
      bestPlayerCount: Number(row?.bestPlayerCount ?? 0),
    };
  }
}

/**
 * DTO에서 **실제로 전달된** 필드만 남긴다.
 *
 * tsconfig의 target이 ES2023이라 useDefineForClassFields가 켜지고, DTO의 선언만
 * 있는 필드가 런타임 클래스 필드로 만들어진다. 그래서 `{ nickname }` 하나만 보낸
 * 요청도 ValidationPipe를 지나면 나머지 5개 키가 `undefined` 값으로 **존재한다.**
 *
 * 그대로 Object.assign 하면 DB는 무사하지만(TypeORM이 undefined를 "변경 없음"으로
 * 본다) 메모리의 엔티티가 오염돼 응답 DTO가 그 필드를 잃는다 — JSON.stringify가
 * undefined 키를 지우기 때문에 PATCH 응답이 UserDetailDto 계약을 어긴다.
 */
function definedFieldsOf(dto: UpdateMeDto): Partial<UpdateMeDto> {
  return Object.fromEntries(
    Object.entries(dto).filter(([, value]) => value !== undefined),
  );
}

/** AVG는 numeric이라 드라이버가 문자열로 준다. 소수점 첫째 자리까지만 노출한다 */
function round(value: string | null | undefined): number {
  return value === null || value === undefined
    ? 0
    : Math.round(Number(value) * 10) / 10;
}
