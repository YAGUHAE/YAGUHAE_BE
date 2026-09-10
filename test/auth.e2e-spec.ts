import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { createTestingApp } from './utils/create-testing-app';

/**
 * DB 행이 필요 없는 경로만 다룬다 — 파이프·가드가 만드는 에러 봉투가 계약대로
 * 나가는지 확인하는 것이 목적이다. 로그인 성공 경로는 서비스 단위 테스트에 있다.
 */
describe('Auth (e2e)', () => {
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

  it('DTO 검증 실패는 422 VALIDATION_FAILED + detail.messages', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/host/login')
      .send({ email: 'not-an-email', password: '' })
      .expect(422)
      .expect((res) => {
        expect(res.body).toMatchObject({
          success: false,
          code: 'VALIDATION_FAILED',
          statusCode: 422,
          path: '/api/v1/auth/host/login',
        });
        expect(
          (res.body as { detail: { messages: string[] } }).detail.messages
            .length,
        ).toBeGreaterThan(0);
      });
  });

  it('refresh 토큰이 없으면 401 INVALID_REFRESH_TOKEN', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({})
      .expect(401)
      .expect((res) => {
        expect(res.body).toMatchObject({
          success: false,
          code: 'INVALID_REFRESH_TOKEN',
        });
      });
  });

  it('두 세션 refresh 쿠키가 공존하면 422 SESSION_AMBIGUOUS', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', ['player_refresh=p', 'admin_refresh=a'])
      .send({})
      .expect(422)
      .expect((res) => {
        expect(res.body).toMatchObject({
          success: false,
          code: 'SESSION_AMBIGUOUS',
        });
      });
  });

  it('access 토큰 없이 로그아웃하면 401 UNAUTHORIZED', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .send({})
      .expect(401)
      .expect((res) => {
        expect(res.body).toMatchObject({
          success: false,
          code: 'UNAUTHORIZED',
        });
      });
  });
});
