import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { createTestingApp } from './utils/create-testing-app';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = (await createTestingApp(moduleFixture)) as INestApplication<App>;
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1 은 공통 봉투로 감싼 응답을 준다', () => {
    return request(app.getHttpServer())
      .get('/api/v1')
      .expect(200)
      .expect((res) => {
        expect(res.body).toMatchObject({ success: true, data: 'Hello World!' });
        expect(typeof (res.body as { timestamp: unknown }).timestamp).toBe(
          'string',
        );
      });
  });

  it('전역 prefix 밖의 경로는 공통 에러 봉투로 404를 준다', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(404)
      .expect((res) => {
        expect(res.body).toMatchObject({
          success: false,
          code: 'NOT_FOUND',
          statusCode: 404,
          path: '/',
        });
      });
  });
});
