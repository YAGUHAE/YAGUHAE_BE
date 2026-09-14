import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { plainToInstance } from 'class-transformer';
import { League } from '../league/entities/league.entity';
import { BankService } from './bank.service';
import { UpdateBankDto } from './dto/update-bank.dto';
import { Bank } from './entities/bank.entity';

const BANK_ID = '00000000-0000-4000-8000-000000000001';

const buildBank = (overrides: Partial<Bank> = {}): Bank =>
  ({
    id: BANK_ID,
    bankName: '카카오뱅크',
    account: '3333-01-1234567',
    holder: '홍길동',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  }) as Bank;

const captureError = async (run: () => Promise<unknown>): Promise<unknown> => {
  try {
    await run();
  } catch (error) {
    return error;
  }
  throw new Error('에러가 발생하지 않았다');
};

describe('BankService', () => {
  let service: BankService;
  let bankRepository: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
  };
  let leagueRepository: { count: jest.Mock };

  beforeEach(async () => {
    bankRepository = {
      find: jest.fn(),
      findOne: jest.fn().mockResolvedValue(buildBank()),
      create: jest.fn().mockImplementation((dto: Partial<Bank>) => dto as Bank),
      save: jest.fn().mockImplementation((bank: Bank) => Promise.resolve(bank)),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    leagueRepository = { count: jest.fn().mockResolvedValue(0) };

    const module = await Test.createTestingModule({
      providers: [
        BankService,
        { provide: getRepositoryToken(Bank), useValue: bankRepository },
        { provide: getRepositoryToken(League), useValue: leagueRepository },
      ],
    }).compile();

    service = module.get(BankService);
  });

  describe('findAll', () => {
    it('최신 등록 순으로 items에 담아 반환한다', async () => {
      bankRepository.find.mockResolvedValue([buildBank()]);

      const result = await service.findAll();

      expect(bankRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
      });
      expect(result.items).toEqual([
        {
          id: BANK_ID,
          bankName: '카카오뱅크',
          account: '3333-01-1234567',
          holder: '홍길동',
        },
      ]);
    });

    it('createdAt·updatedAt은 응답에 싣지 않는다', async () => {
      bankRepository.find.mockResolvedValue([buildBank()]);

      const [item] = (await service.findAll()).items;

      expect(item).not.toHaveProperty('createdAt');
      expect(item).not.toHaveProperty('updatedAt');
    });
  });

  describe('create', () => {
    it('저장한 계좌를 BankDto로 반환한다', async () => {
      bankRepository.save.mockResolvedValue(buildBank());

      await expect(
        service.create({
          bankName: '카카오뱅크',
          account: '3333-01-1234567',
          holder: '홍길동',
        }),
      ).resolves.toMatchObject({ id: BANK_ID, holder: '홍길동' });
    });
  });

  describe('update', () => {
    it('전달된 필드만 덮어쓴다', async () => {
      const result = await service.update(BANK_ID, { holder: '김회계' });

      expect(result).toMatchObject({
        holder: '김회계',
        bankName: '카카오뱅크',
        account: '3333-01-1234567',
      });
    });

    /**
     * `UpdateMeDto`와 달리 `PartialType`으로 만든 클래스는 필드를 TS 클래스 필드로
     * 선언하지 않아, ValidationPipe를 지나도 전달하지 않은 키가 생기지 않는다
     * (`UpdateMeDto`는 선언이 있어 `undefined` 키가 실린다 — defined-fields.util).
     * 그래도 실제 파이프라인을 한 번 태워 두 경로를 함께 고정한다.
     */
    it('ValidationPipe를 지난 인스턴스로도 미지정 필드가 유지된다', async () => {
      const dto = plainToInstance(
        UpdateBankDto,
        { holder: '김회계' },
        { enableImplicitConversion: false },
      );

      const result = await service.update(BANK_ID, dto);

      expect(result.bankName).toBe('카카오뱅크');
      expect(result.account).toBe('3333-01-1234567');
    });

    it('undefined 값이 실려 와도 기존 값을 지우지 않는다', async () => {
      const result = await service.update(BANK_ID, {
        holder: '김회계',
        bankName: undefined,
        account: undefined,
      });

      expect(result).toMatchObject({
        holder: '김회계',
        bankName: '카카오뱅크',
        account: '3333-01-1234567',
      });
    });

    it('없는 계좌는 404 NOT_FOUND', async () => {
      bankRepository.findOne.mockResolvedValue(null);

      await expect(
        service.update(BANK_ID, { holder: '김회계' }),
      ).rejects.toMatchObject({
        code: 'NOT_FOUND',
        status: HttpStatus.NOT_FOUND,
      });
    });
  });

  describe('remove', () => {
    it('참조하는 리그가 없으면 삭제한다', async () => {
      await service.remove(BANK_ID);

      expect(bankRepository.delete).toHaveBeenCalledWith(BANK_ID);
    });

    it('참조 중인 리그가 있으면 409 BANK_IN_USE이고 삭제하지 않는다', async () => {
      leagueRepository.count.mockResolvedValue(2);

      const error = await captureError(() => service.remove(BANK_ID));

      expect(error).toMatchObject({
        code: 'BANK_IN_USE',
        status: HttpStatus.CONFLICT,
      });
      // 몇 개가 막고 있는지 알려줘야 어드민이 어디를 고칠지 판단할 수 있다.
      expect(error).toMatchObject({
        response: { detail: { leagueCount: 2 } },
      });
      expect(bankRepository.delete).not.toHaveBeenCalled();
    });

    it('검사 직후 참조가 생겨 FK가 막으면 같은 409로 바꿔 돌려준다', async () => {
      // 검사 시점엔 0, 삭제가 실패한 뒤 다시 세면 1 — 경합을 재현한다.
      leagueRepository.count.mockResolvedValueOnce(0).mockResolvedValueOnce(1);
      bankRepository.delete.mockRejectedValue(
        new Error('violates foreign key constraint'),
      );

      await expect(service.remove(BANK_ID)).rejects.toMatchObject({
        code: 'BANK_IN_USE',
        status: HttpStatus.CONFLICT,
      });
    });

    it('참조 때문이 아닌 삭제 실패는 그대로 올린다', async () => {
      const failure = new Error('연결이 끊겼다');
      bankRepository.delete.mockRejectedValue(failure);

      await expect(service.remove(BANK_ID)).rejects.toBe(failure);
    });

    it('없는 계좌는 404 NOT_FOUND', async () => {
      bankRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(BANK_ID)).rejects.toMatchObject({
        code: 'NOT_FOUND',
        status: HttpStatus.NOT_FOUND,
      });
    });
  });
});
