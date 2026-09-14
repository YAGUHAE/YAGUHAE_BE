import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare } from 'bcryptjs';
import { createHash } from 'crypto';
import { DataSource, IsNull, Repository } from 'typeorm';
import { UserRole } from '../common/enums';
import { ErrorCode } from '../common/enums/error-code.enum';
import { BusinessException } from '../common/exceptions/business.exception';
import { League } from '../league/entities/league.entity';
import { User } from '../user/entities/user.entity';
import { AuthTokenResponseDto } from './dto/auth-token-response.dto';
import { HostLoginDto } from './dto/host-login.dto';
import { KakaoAccount } from './strategies/kakao.strategy';
import { UserSummaryDto } from './dto/user-summary.dto';
import { RefreshToken } from './entities/refresh-token.entity';
import {
  AuthenticatedUser,
  JwtPayload,
  RefreshTokenContext,
} from './types/jwt-payload.type';
import { IssuedTokens } from './utils/session-cookie.util';

export interface AuthResult {
  body: AuthTokenResponseDto;
  tokens: IssuedTokens;
  role: UserRole;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    // TODO: LeagueModule이 생기면 LeagueService 주입으로 교체한다.
    // 로그인 응답의 leagueId(API 명세서 §1) 때문에 지금은 리포지토리를 직접 본다.
    @InjectRepository(League)
    private readonly leagueRepository: Repository<League>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  /** API 명세서 §1 — `POST /auth/host/login` */
  async hostLogin(dto: HostLoginDto): Promise<AuthResult> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email, role: UserRole.HOST },
    });

    // 계정이 없는 경우와 비밀번호가 틀린 경우를 구분하지 않는다.
    // 구분하면 이메일 존재 여부를 확인하는 도구가 된다.
    if (
      !user?.passwordHash ||
      !(await compare(dto.password, user.passwordHash))
    ) {
      throw new BusinessException(
        ErrorCode.INVALID_CREDENTIALS,
        '이메일 또는 비밀번호가 올바르지 않습니다.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return this.startSession(user);
  }

  /**
   * API 명세서 §1 — `GET /auth/kakao/callback`
   *
   * 최초 로그인이면 계정을 만든다. 별도의 회원가입 단계가 없고, 프로필은
   * 온보딩에서 채운다 — 그래서 여기서 만드는 행은 nickname 말고는 비어 있다.
   */
  async kakaoLogin(account: KakaoAccount): Promise<AuthResult> {
    const user =
      (await this.findByProvider(account)) ??
      (await this.createPlayer(account));

    // 카카오에서 번호를 새로 받았고 아직 비어 있으면 채운다.
    // 이미 값이 있으면 덮지 않는다 — 사용자가 온보딩에서 고쳤을 수 있다.
    if (!user.phone && account.phone) {
      user.phone = account.phone;
      await this.userRepository.update(user.id, { phone: account.phone });
    }

    return this.startSession(user);
  }

  private findByProvider(account: KakaoAccount): Promise<User | null> {
    return this.userRepository.findOne({
      where: { provider: account.provider, providerId: account.providerId },
    });
  }

  private async createPlayer(account: KakaoAccount): Promise<User> {
    try {
      return await this.userRepository.save(
        this.userRepository.create({
          role: UserRole.PLAYER,
          provider: account.provider,
          providerId: account.providerId,
          nickname: account.nickname,
          phone: account.phone,
        }),
      );
    } catch (error) {
      // 같은 계정으로 동시에 두 번 들어오면 provider_id 부분 유니크에 걸린다.
      // 먼저 들어간 쪽이 만든 행을 쓰면 되므로 실패로 취급하지 않는다.
      const existing = await this.findByProvider(account);
      if (!existing) {
        throw error;
      }
      return existing;
    }
  }

  /**
   * API 명세서 §1 — `POST /auth/refresh`
   *
   * 회전(rotation)한다: 쓰인 토큰은 즉시 무효화하고 새 쌍을 발급한다.
   * 그래야 **이미 무효화된 토큰의 재제시**가 탈취 신호가 된다 (ERD §2.12).
   */
  async refresh(context: RefreshTokenContext): Promise<AuthResult> {
    const tokenHash = hashToken(context.raw);
    const stored = await this.refreshTokenRepository.findOne({
      where: { tokenHash },
    });

    if (!stored) {
      throw this.invalidRefreshToken();
    }

    if (stored.revokedAt) {
      // 이미 무효화된 토큰이 다시 왔다 = 유출됐다고 본다. 해당 유저의 전 세션을 끊는다.
      await this.revokeAllForUser(stored.userId);
      throw this.invalidRefreshToken();
    }

    if (stored.expiresAt.getTime() <= Date.now()) {
      throw this.invalidRefreshToken();
    }

    const user = await this.userRepository.findOne({
      where: { id: stored.userId },
    });

    if (!user) {
      throw this.invalidRefreshToken();
    }

    return this.startSession(user, stored.id);
  }

  /**
   * API 명세서 §1 — `POST /auth/logout`
   *
   * 없는 토큰이어도 성공으로 끝낸다. 로그아웃은 멱등해야 하고, "그런 토큰 없음"을
   * 알려주는 것은 토큰 유효성 확인 도구가 된다.
   */
  async logout(
    user: AuthenticatedUser,
    presentedToken?: string,
  ): Promise<void> {
    if (!presentedToken) {
      return;
    }

    await this.refreshTokenRepository.update(
      {
        tokenHash: hashToken(presentedToken),
        userId: user.id,
        revokedAt: IsNull(),
      },
      { revokedAt: new Date() },
    );
  }

  /**
   * 토큰 쌍을 발급하고 refresh 행을 저장한다.
   *
   * `revokeTokenId`가 있으면 그 행의 무효화와 새 행의 저장을 한 트랜잭션으로 묶는다 —
   * 갈라지면 옛 토큰만 죽고 새 토큰은 없는 상태가 된다.
   */
  private async startSession(
    user: User,
    revokeTokenId?: string,
  ): Promise<AuthResult> {
    if (user.isSuspended) {
      throw new BusinessException(
        ErrorCode.USER_SUSPENDED,
        '정지된 계정입니다.',
        HttpStatus.FORBIDDEN,
      );
    }

    const tokens = await this.signTokens(user);

    await this.dataSource.transaction(async (manager) => {
      if (revokeTokenId) {
        await manager.update(
          RefreshToken,
          { id: revokeTokenId, revokedAt: IsNull() },
          { revokedAt: new Date() },
        );
      }

      await manager.insert(RefreshToken, {
        userId: user.id,
        tokenHash: hashToken(tokens.refreshToken),
        expiresAt: new Date(tokens.refreshExpiresAt),
      });
    });

    return {
      role: user.role,
      tokens,
      body: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: UserSummaryDto.from(user),
        leagueId: await this.findLatestLeagueId(user),
      },
    };
  }

  private async signTokens(user: User): Promise<IssuedTokens> {
    const payload: JwtPayload = { sub: user.id, role: user.role };

    const accessToken = await this.jwtService.signAsync(payload);
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>(
        'JWT_REFRESH_EXPIRES_IN',
        '14d',
      ) as JwtSignOptions['expiresIn'],
    });

    return {
      accessToken,
      refreshToken,
      accessExpiresAt: this.expiryOf(accessToken),
      refreshExpiresAt: this.expiryOf(refreshToken),
    };
  }

  /** 쿠키 수명과 refresh 행의 만료를 토큰이 말하는 exp 하나에서만 끌어온다 */
  private expiryOf(token: string): number {
    const decoded = this.jwtService.decode<JwtPayload | null>(token);
    return (decoded?.exp ?? 0) * 1000;
  }

  private async findLatestLeagueId(user: User): Promise<string | null> {
    if (user.role !== UserRole.HOST) {
      return null;
    }

    const league = await this.leagueRepository.findOne({
      where: { hostId: user.id },
      order: { createdAt: 'DESC' },
      select: { id: true },
    });

    return league?.id ?? null;
  }

  private async revokeAllForUser(userId: string): Promise<void> {
    await this.refreshTokenRepository.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  private invalidRefreshToken(): BusinessException {
    return new BusinessException(
      ErrorCode.INVALID_REFRESH_TOKEN,
      '유효하지 않은 refresh 토큰입니다.',
      HttpStatus.UNAUTHORIZED,
    );
  }
}

/**
 * refresh 토큰은 bcrypt가 아니라 SHA-256으로 해싱한다.
 *
 * `token_hash`가 UNIQUE이고 조회가 해시 단건 조회이므로(ERD §2.12) 매번 다른 값이
 * 나오는 bcrypt로는 찾을 수 없다. 고엔트로피 토큰이라 스트레칭도 필요 없다.
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
