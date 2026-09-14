import {
  ArgumentsHost,
  HttpStatus,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ErrorCode } from '../../common/enums/error-code.enum';
import { BusinessException } from '../../common/exceptions/business.exception';
import { KakaoRedirectFilter } from './kakao-redirect.filter';

describe('KakaoRedirectFilter', () => {
  let redirect: jest.Mock<void, [string]>;
  let host: ArgumentsHost;
  let filter: KakaoRedirectFilter;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    redirect = jest.fn<void, [string]>();
    host = {
      switchToHttp: () => ({ getResponse: () => ({ redirect }) }),
    } as unknown as ArgumentsHost;
    filter = new KakaoRedirectFilter({
      get: (key: string, fallback?: string) =>
        key === 'FRONT_ORIGIN' ? 'https://yaguhae.kr' : fallback,
    } as unknown as ConfigService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('JSON 대신 프론트 로그인 화면으로 리다이렉트한다', () => {
    filter.catch(new UnauthorizedException(), host);

    expect(redirect).toHaveBeenCalledWith(
      'https://yaguhae.kr/login?error=UNAUTHORIZED',
    );
  });

  it('도메인 에러 코드를 그대로 싣는다', () => {
    filter.catch(
      new BusinessException(
        ErrorCode.USER_SUSPENDED,
        '정지된 계정입니다.',
        HttpStatus.FORBIDDEN,
      ),
      host,
    );

    expect(redirect).toHaveBeenCalledWith(
      'https://yaguhae.kr/login?error=USER_SUSPENDED',
    );
  });

  it('예상치 못한 예외는 내부 메시지를 노출하지 않는다', () => {
    filter.catch(new Error('select * from users ...'), host);

    expect(redirect).toHaveBeenCalledWith(
      'https://yaguhae.kr/login?error=INTERNAL_ERROR',
    );
  });
});
