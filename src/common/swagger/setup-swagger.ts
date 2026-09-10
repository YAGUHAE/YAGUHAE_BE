import { INestApplication, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import basicAuth from 'express-basic-auth';

const SWAGGER_PATH = 'api/docs';

/** SwaggerModule.setup이 함께 여는 경로들. 하나라도 빠뜨리면 그 문으로 스펙이 새어 나간다 */
const PROTECTED_PATHS = [
  `/${SWAGGER_PATH}`,
  `/${SWAGGER_PATH}-json`,
  `/${SWAGGER_PATH}-yaml`,
];

/**
 * API 문서를 연다.
 *
 * 기본값은 "운영에서는 닫혀 있고 그 외에는 열려 있다"이며, `SWAGGER_ENABLED`로
 * 뒤집을 수 있다. 운영에서 열 때는 **Basic 인증이 필수**다 — 스펙 문서는 모든
 * 엔드포인트·파라미터·에러 코드의 지도라서, 공개하면 공격자에게 정찰 단계를
 * 통째로 건네주는 셈이다.
 */
export function setupSwagger(
  app: INestApplication,
  configService: ConfigService,
): void {
  const logger = new Logger('Swagger');
  const isProduction =
    configService.get<string>('NODE_ENV', 'development') === 'production';

  const flag = configService.get<string>('SWAGGER_ENABLED');
  const enabled = flag === undefined ? !isProduction : flag === 'true';

  if (!enabled) {
    return;
  }

  const username = configService.get<string>('SWAGGER_USER');
  const password = configService.get<string>('SWAGGER_PASSWORD');

  if (isProduction && !(username && password)) {
    // 부팅을 막지는 않는다. 문서 설정 하나 때문에 API 전체가 내려가면 더 나쁘다.
    logger.error(
      'SWAGGER_ENABLED=true 이지만 SWAGGER_USER/SWAGGER_PASSWORD가 없어 문서를 열지 않습니다.',
    );
    return;
  }

  if (username && password) {
    app.use(
      PROTECTED_PATHS,
      basicAuth({ users: { [username]: password }, challenge: true }),
    );
  }

  const config = new DocumentBuilder()
    .setTitle('야구해 API')
    .setDescription('야구 커뮤니티 플랫폼 백엔드 API 문서')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  SwaggerModule.setup(
    SWAGGER_PATH,
    app,
    SwaggerModule.createDocument(app, config),
  );

  logger.log(
    `API 문서: /${SWAGGER_PATH} (Basic 인증 ${username && password ? '적용' : '없음'})`,
  );
}
