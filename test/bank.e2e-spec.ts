import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { UserRole } from './../src/common/enums';
import { AppModule } from './../src/app.module';
import { createTestingApp } from './utils/create-testing-app';

/**
 * DB 행이 필요 없는 경로만 다룬다 — 가드·파이프가 계약대로 막는지가 목적이다.
 * `JwtStrategy`가 DB를 보지 않으므로(유저 조회를 매 요청에 붙이지 않는다)
 * 토큰만 서명하면 역할별 분기를 여기서 확인할 수 있다.
 */
describe('Banks (e2e)', () => {
  let app: INestApplication<App>;
  let playerToken: string;
  let hostToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = (await createTestingApp(moduleFixture)) as INestApplication<App>;

    const jwtService = app.get(JwtService);
    playerToken = await jwtService.signAsync({
      sub: 1,
      role: UserRole.PLAYER,
    });
    hostToken = await jwtService.signAsync({ sub: 2, role: UserRole.HOST });
  });

  afterAll(async () => {
    await app.close();
  });

  it('토큰 없이 조회하면 401 UNAUTHORIZED', () => {
    return request(app.getHttpServer())
      .get('/api/v1/banks')
      .expect(401)
      .expect((res) => {
        expect(res.body).toMatchObject({
          success: false,
          code: 'UNAUTHORIZED',
        });
      });
  });

  it('PLAYER 토큰으로 등록하면 403 FORBIDDEN', () => {
    return request(app.getHttpServer())
      .post('/api/v1/banks')
      .set('Authorization', `Bearer ${playerToken}`)
      .send({ bankName: '카카오뱅크', account: '3333', holder: '홍길동' })
      .expect(403)
      .expect((res) => {
        expect(res.body).toMatchObject({ success: false, code: 'FORBIDDEN' });
      });
  });

  it('HOST 토큰이어도 DTO가 비면 422 VALIDATION_FAILED', () => {
    return request(app.getHttpServer())
      .post('/api/v1/banks')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({ bankName: '', account: '3333', holder: '홍길동' })
      .expect(422)
      .expect((res) => {
        expect(res.body).toMatchObject({
          success: false,
          code: 'VALIDATION_FAILED',
        });
      });
  });

  /**
   * 전역 ValidationPipe의 422 설정은 body 검증에만 적용된다 — 경로 파라미터
   * 파이프는 400을 낸다 (API 명세서 §0.3).
   */
  it('id가 uuid가 아니면 400', () => {
    return request(app.getHttpServer())
      .delete('/api/v1/banks/not-a-uuid')
      .set('Authorization', `Bearer ${hostToken}`)
      .expect(400);
  });
});
