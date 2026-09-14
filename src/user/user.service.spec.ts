import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LevelEnum, Position, UserRole } from '../common/enums';
import { Evaluation } from '../evaluation/entities/evaluation.entity';
import { User } from './entities/user.entity';
import { UserService } from './user.service';

const buildUser = (overrides: Partial<User> = {}): User =>
  ({
    id: 'u1',
    role: UserRole.PLAYER,
    email: null,
    passwordHash: null,
    provider: null,
    providerId: 'kakao-1',
    nickname: '용병',
    phone: '+821012345678',
    region: '서울',
    primaryPosition: Position.SS,
    selfLevel: LevelEnum.L2,
    gamewonUrl: null,
    uniqueplayUrl: null,
    noShowCount: 1,
    isSuspended: false,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  }) as User;

describe('UserService', () => {
  let service: UserService;
  let userRepository: { findOne: jest.Mock; save: jest.Mock };
  let queryBuilder: { [k: string]: jest.Mock };

  beforeEach(async () => {
    userRepository = { findOne: jest.fn(), save: jest.fn() };
    queryBuilder = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(User), useValue: userRepository },
        {
          provide: getRepositoryToken(Evaluation),
          useValue: { createQueryBuilder: () => queryBuilder },
        },
      ],
    }).compile();

    service = module.get(UserService);
  });

  describe('findMe', () => {
    it('본인 조회에는 noShowCount가 실린다', async () => {
      userRepository.findOne.mockResolvedValue(buildUser());

      await expect(service.findMe('u1')).resolves.toMatchObject({
        id: 'u1',
        noShowCount: 1,
        profileCompleted: true,
      });
    });

    it('passwordHash·providerId는 응답에 없다', async () => {
      userRepository.findOne.mockResolvedValue(
        buildUser({ passwordHash: 'hashed', providerId: 'kakao-1' }),
      );

      const result = await service.findMe('u1');

      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('providerId');
    });

    it('nickname·region·selfLevel 중 하나라도 비면 profileCompleted=false', async () => {
      userRepository.findOne.mockResolvedValue(buildUser({ selfLevel: null }));

      await expect(service.findMe('u1')).resolves.toMatchObject({
        profileCompleted: false,
      });
    });

    it('없는 사용자는 404 NOT_FOUND', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.findMe('nope')).rejects.toMatchObject({
        code: 'NOT_FOUND',
        status: HttpStatus.NOT_FOUND,
      });
    });
  });

  describe('updateMe', () => {
    it('전달된 필드만 덮어쓴다', async () => {
      const user = buildUser();
      userRepository.findOne.mockResolvedValue(user);
      userRepository.save.mockImplementation((u: User) => Promise.resolve(u));

      const result = await service.updateMe('u1', { nickname: '새이름' });

      expect(result.nickname).toBe('새이름');
      expect(result.region).toBe('서울');
    });
  });

  describe('findProfile', () => {
    beforeEach(() => userRepository.findOne.mockResolvedValue(buildUser()));

    it('공개 프로필에는 신원·노쇼 정보가 없다', async () => {
      queryBuilder.getRawOne.mockResolvedValue({
        mannerAvg: '4.5',
        skillMatchAvg: '4.25',
        punctualityAvg: '5',
        bestPlayerCount: '3',
      });

      const result = await service.findProfile('u1');

      for (const field of [
        'email',
        'provider',
        'providerId',
        'phone',
        'noShowCount',
        'isSuspended',
      ]) {
        expect(result).not.toHaveProperty(field);
      }
    });

    it('평가 평균은 소수점 첫째 자리로 반올림한다', async () => {
      queryBuilder.getRawOne.mockResolvedValue({
        mannerAvg: '4.55',
        skillMatchAvg: '4.24',
        punctualityAvg: '5',
        bestPlayerCount: '3',
      });

      await expect(service.findProfile('u1')).resolves.toMatchObject({
        evaluationSummary: {
          mannerAvg: 4.6,
          skillMatchAvg: 4.2,
          punctualityAvg: 5,
          bestPlayerCount: 3,
        },
      });
    });

    it('평가가 없으면 AVG가 null이므로 0으로 떨어뜨린다', async () => {
      queryBuilder.getRawOne.mockResolvedValue({
        mannerAvg: null,
        skillMatchAvg: null,
        punctualityAvg: null,
        bestPlayerCount: '0',
      });

      await expect(service.findProfile('u1')).resolves.toMatchObject({
        evaluationSummary: {
          mannerAvg: 0,
          skillMatchAvg: 0,
          punctualityAvg: 0,
          bestPlayerCount: 0,
        },
      });
    });
  });
});
