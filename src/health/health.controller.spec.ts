import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  let dataSource: { query: jest.Mock };

  beforeEach(async () => {
    dataSource = { query: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: getDataSourceToken(), useValue: dataSource }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe('check', () => {
    it('DB를 조회하지 않고 ok를 반환한다', () => {
      expect(controller.check().status).toBe('ok');
      expect(dataSource.query).not.toHaveBeenCalled();
    });
  });

  describe('ready', () => {
    it('DB 연결이 정상이면 ok를 반환한다', async () => {
      dataSource.query.mockResolvedValue([{ '?column?': 1 }]);

      const result = await controller.ready();

      expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
      expect(result).toMatchObject({ status: 'ok', database: 'up' });
    });

    it('DB 연결이 실패하면 503을 던진다', async () => {
      dataSource.query.mockRejectedValue(new Error('connection refused'));

      await expect(controller.ready()).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });
});
