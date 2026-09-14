import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { Bank } from '../bank/entities/bank.entity';
import { LeagueService } from './league.service';
import { UpdateLeagueDto } from './dto/update-league.dto';
import { League } from './entities/league.entity';

const LEAGUE_ID = '00000000-0000-4000-8000-000000000001';
const BANK_ID = '00000000-0000-4000-8000-0000000000b1';
const HOST_ID = 7;

const buildBank = (): Bank =>
  ({
    id: BANK_ID,
    bankName: '카카오뱅크',
    account: '3333-01-1234567',
    holder: '홍길동',
  }) as Bank;

const buildLeague = (overrides: Partial<League> = {}): League =>
  ({
    id: LEAGUE_ID,
    hostId: HOST_ID,
    bankId: BANK_ID,
    bank: buildBank(),
    name: '주말 리그',
    region: '서울',
    stadiumName: '잠실 야구장',
    intro: null,
    defaultFees: { PITCHER: 30000, FIELDER: 20000 },
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  }) as League;

describe('LeagueService', () => {
  let service: LeagueService;
  let leagueRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let bankRepository: { exists: jest.Mock };

  beforeEach(async () => {
    leagueRepository = {
      find: jest.fn().mockResolvedValue([buildLeague()]),
      findOne: jest.fn().mockResolvedValue(buildLeague()),
      create: jest
        .fn()
        .mockImplementation((league: Partial<League>) => league as League),
      save: jest
        .fn()
        .mockImplementation((league: League) =>
          Promise.resolve({ ...buildLeague(), ...league }),
        ),
    };
    bankRepository = { exists: jest.fn().mockResolvedValue(true) };

    const module = await Test.createTestingModule({
      providers: [
        LeagueService,
        { provide: getRepositoryToken(League), useValue: leagueRepository },
        { provide: getRepositoryToken(Bank), useValue: bankRepository },
      ],
    }).compile();

    service = module.get(LeagueService);
  });

  describe('findAll', () => {
    it('계좌를 조인해 bank 객체로 내려준다', async () => {
      const result = await service.findAll();

      expect(leagueRepository.find).toHaveBeenCalledWith({
        relations: { bank: true },
        order: { createdAt: 'DESC' },
      });
      expect(result.items[0].bank).toEqual({
        id: BANK_ID,
        bankName: '카카오뱅크',
        account: '3333-01-1234567',
        holder: '홍길동',
      });
    });

    it('계좌를 아직 등록하지 않은 리그는 bank가 null이다', async () => {
      leagueRepository.find.mockResolvedValue([
        buildLeague({ bankId: null, bank: null }),
      ]);

      await expect(service.findAll()).resolves.toMatchObject({
        items: [{ bank: null }],
      });
    });
  });

  describe('findMine', () => {
    it('내 리그만 조회한다', async () => {
      await service.findMine(HOST_ID);

      expect(leagueRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { hostId: HOST_ID } }),
      );
    });
  });

  describe('findOne', () => {
    it('없는 리그는 404 NOT_FOUND', async () => {
      leagueRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(LEAGUE_ID)).rejects.toMatchObject({
        code: 'NOT_FOUND',
        status: HttpStatus.NOT_FOUND,
      });
    });
  });

  describe('create', () => {
    it('요청자를 주최자로 박아 저장한다', async () => {
      await service.create(HOST_ID, {
        name: '주말 리그',
        region: '서울',
        stadiumName: '잠실 야구장',
      });

      expect(leagueRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ hostId: HOST_ID }),
      );
    });

    it('계좌 없이 만들 수 있다 — A-8이 나중에 등록한다', async () => {
      await service.create(HOST_ID, {
        name: '주말 리그',
        region: '서울',
        stadiumName: '잠실 야구장',
      });

      expect(leagueRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ bankId: null, defaultFees: {} }),
      );
      expect(bankRepository.exists).not.toHaveBeenCalled();
    });

    it('없는 계좌를 가리키면 404 BANK_NOT_FOUND이고 저장하지 않는다', async () => {
      bankRepository.exists.mockResolvedValue(false);

      await expect(
        service.create(HOST_ID, {
          name: '주말 리그',
          region: '서울',
          stadiumName: '잠실 야구장',
          bankId: BANK_ID,
        }),
      ).rejects.toMatchObject({
        code: 'BANK_NOT_FOUND',
        status: HttpStatus.NOT_FOUND,
      });
      expect(leagueRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('전달된 필드만 덮어쓴다', async () => {
      await service.update(LEAGUE_ID, { name: '바뀐 리그' });

      expect(leagueRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: '바뀐 리그', region: '서울' }),
      );
    });

    it('undefined 값이 실려 와도 기존 값을 지우지 않는다', async () => {
      const dto = plainToInstance(
        UpdateLeagueDto,
        { name: '바뀐 리그' },
        { enableImplicitConversion: false },
      );

      await service.update(LEAGUE_ID, dto);

      expect(leagueRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          name: '바뀐 리그',
          stadiumName: '잠실 야구장',
        }),
      );
    });

    it('없는 계좌로 바꾸려 하면 404 BANK_NOT_FOUND', async () => {
      bankRepository.exists.mockResolvedValue(false);

      await expect(
        service.update(LEAGUE_ID, { bankId: BANK_ID }),
      ).rejects.toMatchObject({ code: 'BANK_NOT_FOUND' });
      expect(leagueRepository.save).not.toHaveBeenCalled();
    });

    it('없는 리그는 404 NOT_FOUND', async () => {
      leagueRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update(LEAGUE_ID, { name: 'x' }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    });
  });
});
