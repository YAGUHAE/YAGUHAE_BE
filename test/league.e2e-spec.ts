import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { UserRole } from './../src/common/enums';
import { createTestingApp } from './utils/create-testing-app';

const UNKNOWN_LEAGUE_ID = '00000000-0000-4000-8000-0000000000ff';

/**
 * 가드·파이프가 계약대로 막는지를 본다.
 *
 * 다른 e2e와 달리 **스키마가 필요하다** — 공개 목록과 소유권 가드가 실제로
 * 테이블을 조회하기 때문이다. CI는 e2e 앞에 `pnpm migration:run`을 돌린다.
 * 행을 만들지는 않으므로 실행 순서에 의존하지 않는다.
 */
describe('Leagues (e2e)', () => {
  let app: INestApplication<App>;
  let playerToken: string;
  let hostToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = (await createTestingApp(moduleFixture)) as INestApplication<App>;
    const jwtService = app.get(JwtService);
    playerToken = await jwtService.signAsync({ sub: 1, role: UserRole.PLAYER });
    hostToken = await jwtService.signAsync({ sub: 2, role: UserRole.HOST });
  });

  afterAll(async () => {
    await app.close();
  });

  it('목록은 토큰 없이 볼 수 있다 (공개)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/leagues')
      .expect(200)
      .expect((res) => {
        expect(res.body).toMatchObject({ success: true });
      });
  });

  it('생성은 PLAYER면 403 FORBIDDEN', () => {
    return request(app.getHttpServer())
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${playerToken}`)
      .send({ name: '리그', region: '서울', stadiumName: '잠실' })
      .expect(403)
      .expect((res) => {
        expect(res.body).toMatchObject({ success: false, code: 'FORBIDDEN' });
      });
  });

  it('생성은 토큰 없으면 401', () => {
    return request(app.getHttpServer())
      .post('/api/v1/leagues')
      .send({ name: '리그', region: '서울', stadiumName: '잠실' })
      .expect(401);
  });

  /** `mine`이 `:id` 보다 위에 있어야 ParseUUIDPipe에 걸리지 않는다 */
  it('/leagues/mine 은 :id 라우트에 먹히지 않는다 — 400이 아니라 403', () => {
    return request(app.getHttpServer())
      .get('/api/v1/leagues/mine')
      .set('Authorization', `Bearer ${playerToken}`)
      .expect(403);
  });

  /**
   * 오타난 티어명이 조용히 저장되면 A-4 프리필이 빈 값으로 뜨는데, 그때는
   * 원인이 리그 설정에 있다는 걸 알기 어렵다. 422로 즉시 막는다.
   */
  it('오타난 티어 키를 defaultFees에 실으면 422', () => {
    return request(app.getHttpServer())
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({
        name: '리그',
        region: '서울',
        stadiumName: '잠실',
        defaultFees: { PITCHERS: 30000 },
      })
      .expect(422)
      .expect((res) => {
        expect(res.body).toMatchObject({
          success: false,
          code: 'VALIDATION_FAILED',
        });
      });
  });

  it('참가비에 음수를 넣으면 422', () => {
    return request(app.getHttpServer())
      .post('/api/v1/leagues')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({
        name: '리그',
        region: '서울',
        stadiumName: '잠실',
        defaultFees: { PITCHER: -1 },
      })
      .expect(422);
  });

  /**
   * 회귀 — `@Roles(HOST)`가 빠지면 JwtAuthGuard가 용병 쿠키를 먼저 집어서
   * **주최자가 자기 리그를 수정하지 못하고 403**을 받는다. 두 세션 쿠키는 같은
   * 브라우저에 공존한다 (API 명세서 §1.1). 헤더 경로에서는 드러나지 않는다.
   */
  it('두 세션 쿠키가 공존해도 어드민 세션으로 인증한다', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/leagues/${UNKNOWN_LEAGUE_ID}`)
      .set('Cookie', [
        `player_session=${playerToken}`,
        `admin_session=${hostToken}`,
      ])
      .send({ name: '바뀐 리그' });

    // 용병 쿠키를 집었다면 역할 검사에서 403이 난다. 어드민 쿠키를 집었으므로
    // 소유권 검사까지 가서 "그런 리그 없음"이 된다.
    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ code: 'NOT_FOUND' });
  });

  it('수정은 PLAYER면 403 — 소유권을 보기 전에 역할에서 막힌다', () => {
    return request(app.getHttpServer())
      .patch(`/api/v1/leagues/${UNKNOWN_LEAGUE_ID}`)
      .set('Authorization', `Bearer ${playerToken}`)
      .send({ name: '바뀐 리그' })
      .expect(403);
  });

  /**
   * 소유권 가드는 ParseUUIDPipe보다 먼저 돈다. 가드가 형식을 보지 않으면
   * uuid가 아닌 값이 그대로 쿼리로 내려가 22P02로 500이 난다.
   */
  it('수정은 uuid가 아닌 id면 400', () => {
    return request(app.getHttpServer())
      .patch('/api/v1/leagues/not-a-uuid')
      .set('Authorization', `Bearer ${hostToken}`)
      .send({ name: '바뀐 리그' })
      .expect(400);
  });
});
