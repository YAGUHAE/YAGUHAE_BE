import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule } from '@nestjs/swagger';
import { setupSwagger } from './setup-swagger';

describe('setupSwagger', () => {
  let app: { use: jest.Mock };
  let setup: jest.SpyInstance;

  beforeEach(() => {
    app = { use: jest.fn() };
    setup = jest.spyOn(SwaggerModule, 'setup').mockImplementation(() => {});
    jest
      .spyOn(SwaggerModule, 'createDocument')
      .mockReturnValue({} as ReturnType<typeof SwaggerModule.createDocument>);
  });

  afterEach(() => jest.restoreAllMocks());

  const run = (env: Record<string, string>) => {
    const configService = {
      get: (key: string, fallback?: string) => env[key] ?? fallback,
    } as ConfigService;

    setupSwagger(app as unknown as INestApplication, configService);
  };

  it('운영에서는 기본적으로 열지 않는다', () => {
    run({ NODE_ENV: 'production' });

    expect(setup).not.toHaveBeenCalled();
  });

  it('운영이 아니면 기본적으로 연다', () => {
    run({ NODE_ENV: 'development' });

    expect(setup).toHaveBeenCalled();
    expect(app.use).not.toHaveBeenCalled();
  });

  it('SWAGGER_ENABLED=false면 개발에서도 닫는다', () => {
    run({ NODE_ENV: 'development', SWAGGER_ENABLED: 'false' });

    expect(setup).not.toHaveBeenCalled();
  });

  it('운영에서 계정 없이 켜면 열지 않는다 — 스펙이 무인증으로 새는 것을 막는다', () => {
    run({ NODE_ENV: 'production', SWAGGER_ENABLED: 'true' });

    expect(setup).not.toHaveBeenCalled();
  });

  it('운영에서 계정과 함께 켜면 Basic 인증을 걸고 연다', () => {
    run({
      NODE_ENV: 'production',
      SWAGGER_ENABLED: 'true',
      SWAGGER_USER: 'docs',
      SWAGGER_PASSWORD: 's3cret',
    });

    expect(setup).toHaveBeenCalled();
    expect(app.use).toHaveBeenCalledWith(
      ['/api/docs', '/api/docs-json', '/api/docs-yaml'],
      expect.any(Function),
    );
  });
});
