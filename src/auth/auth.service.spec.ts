import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { hashSync } from 'bcryptjs';
import { createHash } from 'crypto';
import { DataSource, EntityManager } from 'typeorm';
import { OAuthProvider, UserRole } from '../common/enums';
import { League } from '../league/entities/league.entity';
import { User } from '../user/entities/user.entity';
import { AuthService } from './auth.service';
import { RefreshToken } from './entities/refresh-token.entity';

const PASSWORD = 'super-secret';
const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

const buildHost = (overrides: Partial<User> = {}): User =>
  ({
    id: 'host-1',
    role: UserRole.HOST,
    email: 'host@yaguhae.kr',
    passwordHash: hashSync(PASSWORD, 4),
    nickname: '주최자',
    region: '서울',
    selfLevel: 'L2',
    isSuspended: false,
    ...overrides,
  }) as User;

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
  };
  let refreshTokenRepository: { findOne: jest.Mock; update: jest.Mock };
  let leagueRepository: { findOne: jest.Mock };
  let manager: { update: jest.Mock; insert: jest.Mock };

  beforeEach(async () => {
    userRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };
    refreshTokenRepository = { findOne: jest.fn(), update: jest.fn() };
    leagueRepository = { findOne: jest.fn().mockResolvedValue(null) };
    manager = { update: jest.fn(), insert: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepository },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: refreshTokenRepository,
        },
        { provide: getRepositoryToken(League), useValue: leagueRepository },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest
              .fn()
              .mockImplementation((_payload: unknown, options?: unknown) =>
                Promise.resolve(options ? 'refresh-token' : 'access-token'),
              ),
            decode: jest.fn().mockReturnValue({ exp: 2000000000 }),
          },
        },
        {
          provide: ConfigService,
          useValue: { get: () => '14d', getOrThrow: () => 'refresh-secret' },
        },
        {
          provide: DataSource,
          useValue: {
            transaction: (run: (m: EntityManager) => Promise<unknown>) =>
              run(manager as unknown as EntityManager),
          },
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('hostLogin', () => {
    it('계정이 없어도 비밀번호가 틀렸을 때와 같은 에러를 준다', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.hostLogin({ email: 'nobody@yaguhae.kr', password: PASSWORD }),
      ).rejects.toMatchObject({
        code: 'INVALID_CREDENTIALS',
        status: HttpStatus.UNAUTHORIZED,
      });
    });

    it('비밀번호가 틀리면 401 INVALID_CREDENTIALS', async () => {
      userRepository.findOne.mockResolvedValue(buildHost());

      await expect(
        service.hostLogin({ email: 'host@yaguhae.kr', password: 'wrong' }),
      ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    });

    it('정지된 계정은 403 USER_SUSPENDED', async () => {
      userRepository.findOne.mockResolvedValue(
        buildHost({ isSuspended: true }),
      );

      await expect(
        service.hostLogin({ email: 'host@yaguhae.kr', password: PASSWORD }),
      ).rejects.toMatchObject({
        code: 'USER_SUSPENDED',
        status: HttpStatus.FORBIDDEN,
      });
    });

    it('성공하면 토큰을 발급하고 refresh 해시를 저장한다', async () => {
      userRepository.findOne.mockResolvedValue(buildHost());
      leagueRepository.findOne.mockResolvedValue({ id: 'league-1' });

      const result = await service.hostLogin({
        email: 'host@yaguhae.kr',
        password: PASSWORD,
      });

      expect(result.body).toMatchObject({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        leagueId: 'league-1',
        user: { id: 'host-1', role: UserRole.HOST, profileCompleted: true },
      });
      expect(manager.insert).toHaveBeenCalledWith(
        RefreshToken,
        expect.objectContaining({
          userId: 'host-1',
          // 평문이 아니라 해시가 저장돼야 한다 (ERD §2.12)
          tokenHash: sha256('refresh-token'),
        }),
      );
    });

    it('PLAYER가 아닌 HOST만 leagueId를 갖는다', async () => {
      userRepository.findOne.mockResolvedValue(
        buildHost({ role: UserRole.PLAYER }),
      );

      const result = await service.hostLogin({
        email: 'host@yaguhae.kr',
        password: PASSWORD,
      });

      expect(result.body.leagueId).toBeNull();
      expect(leagueRepository.findOne).not.toHaveBeenCalled();
    });
  });

  describe('kakaoLogin', () => {
    const account = {
      provider: OAuthProvider.KAKAO,
      providerId: 'kakao-1',
      nickname: '용병',
      phone: '+821012345678',
    };

    it('기존 계정이 있으면 그대로 세션을 연다', async () => {
      const user = buildHost({
        role: UserRole.PLAYER,
        provider: OAuthProvider.KAKAO,
        providerId: 'kakao-1',
        phone: '+821012345678',
      });
      userRepository.findOne.mockResolvedValue(user);

      const result = await service.kakaoLogin(account);

      expect(result.body.accessToken).toBe('access-token');
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('최초 로그인이면 PLAYER 계정을 만든다', async () => {
      userRepository.findOne.mockResolvedValue(null);
      userRepository.create.mockImplementation((u: Partial<User>) => u as User);
      userRepository.save.mockImplementation((u: User) =>
        Promise.resolve({ ...u, id: 'new-1', isSuspended: false } as User),
      );

      await service.kakaoLogin(account);

      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          role: UserRole.PLAYER,
          provider: OAuthProvider.KAKAO,
          providerId: 'kakao-1',
          nickname: '용병',
        }),
      );
    });

    it('동시 최초 로그인으로 유니크 위반이 나면 먼저 들어간 행을 쓴다', async () => {
      const existing = buildHost({ role: UserRole.PLAYER, id: 'raced' });
      userRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(existing);
      userRepository.create.mockImplementation((u: Partial<User>) => u as User);
      userRepository.save.mockRejectedValue(
        new Error('duplicate key value violates unique constraint'),
      );

      const result = await service.kakaoLogin(account);

      expect(result.body.user.id).toBe('raced');
    });

    it('이미 저장된 번호는 덮지 않는다', async () => {
      userRepository.findOne.mockResolvedValue(
        buildHost({ role: UserRole.PLAYER, phone: '+821099998888' }),
      );

      await service.kakaoLogin(account);

      expect(userRepository.update).not.toHaveBeenCalled();
    });

    it('번호가 비어 있으면 카카오에서 받은 값으로 채운다', async () => {
      userRepository.findOne.mockResolvedValue(
        buildHost({ role: UserRole.PLAYER, phone: null }),
      );

      await service.kakaoLogin(account);

      expect(userRepository.update).toHaveBeenCalledWith('host-1', {
        phone: '+821012345678',
      });
    });
  });

  describe('refresh', () => {
    const context = {
      raw: 'presented',
      payload: { sub: 'host-1', role: UserRole.HOST },
    };

    it('저장되지 않은 토큰은 401', async () => {
      refreshTokenRepository.findOne.mockResolvedValue(null);

      await expect(service.refresh(context)).rejects.toMatchObject({
        code: 'INVALID_REFRESH_TOKEN',
      });
    });

    it('이미 무효화된 토큰의 재제시는 유저의 전 세션을 끊는다', async () => {
      refreshTokenRepository.findOne.mockResolvedValue({
        id: 'rt-1',
        userId: 'host-1',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 1000),
      });

      await expect(service.refresh(context)).rejects.toMatchObject({
        code: 'INVALID_REFRESH_TOKEN',
      });
      expect(refreshTokenRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'host-1' }),
        expect.objectContaining({ revokedAt: expect.any(Date) as Date }),
      );
    });

    it('만료된 행은 401', async () => {
      refreshTokenRepository.findOne.mockResolvedValue({
        id: 'rt-1',
        userId: 'host-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.refresh(context)).rejects.toMatchObject({
        code: 'INVALID_REFRESH_TOKEN',
      });
    });

    it('성공하면 옛 행을 무효화하고 새 행을 같은 트랜잭션에서 저장한다', async () => {
      refreshTokenRepository.findOne.mockResolvedValue({
        id: 'rt-1',
        userId: 'host-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      });
      userRepository.findOne.mockResolvedValue(buildHost());

      const result = await service.refresh(context);

      expect(result.body.accessToken).toBe('access-token');
      expect(manager.update).toHaveBeenCalledWith(
        RefreshToken,
        expect.objectContaining({ id: 'rt-1' }),
        expect.objectContaining({ revokedAt: expect.any(Date) as Date }),
      );
      expect(manager.insert).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    const user = { id: 'host-1', role: UserRole.HOST };

    it('토큰이 없으면 아무것도 하지 않는다 (멱등)', async () => {
      await service.logout(user);

      expect(refreshTokenRepository.update).not.toHaveBeenCalled();
    });

    it('제시된 토큰의 해시로 무효화한다', async () => {
      await service.logout(user, 'presented');

      expect(refreshTokenRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          tokenHash: sha256('presented'),
          userId: 'host-1',
        }),
        expect.objectContaining({ revokedAt: expect.any(Date) as Date }),
      );
    });
  });
});
