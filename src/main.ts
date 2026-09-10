import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  // 운영 환경에서는 nginx 리버스 프록시 뒤에서 실행되므로
  // X-Forwarded-* 헤더를 신뢰해 req.ip / 프로토콜을 실제 클라이언트 값으로 인식한다.
  app.set('trust proxy', 1);

  app.setGlobalPrefix('api/v1');

  // 인증 토큰을 httpOnly 쿠키로도 받는다 (API 명세서 §1.1).
  app.use(cookieParser());

  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN', 'http://localhost:3000'),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      // API 명세서 §0.2 — DTO 검증 실패는 400이 아니라 422 VALIDATION_FAILED
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    }),
  );

  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  // 스펙 문서를 외부에 노출할 이유가 없으므로 운영 환경에서는 띄우지 않는다.
  if (nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('야구해 API')
      .setDescription('야구 커뮤니티 플랫폼 백엔드 API 문서')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup(
      'api/docs',
      app,
      SwaggerModule.createDocument(app, config),
    );
  }

  await app.listen(configService.get<number>('PORT', 4000));
}
void bootstrap();
