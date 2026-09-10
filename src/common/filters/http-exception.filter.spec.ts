import {
  ArgumentsHost,
  BadRequestException,
  HttpStatus,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ErrorCode } from '../enums/error-code.enum';
import { BusinessException } from '../exceptions/business.exception';
import { AllExceptionsFilter } from './http-exception.filter';

describe('AllExceptionsFilter', () => {
  const filter = new AllExceptionsFilter();
  let json: jest.Mock<void, [Record<string, unknown>]>;
  let status: jest.Mock;
  let host: ArgumentsHost;

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    json = jest.fn<void, [Record<string, unknown>]>();
    status = jest.fn().mockReturnValue({ json });
    host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ url: '/api/v1/auth/login', method: 'POST' }),
      }),
    } as unknown as ArgumentsHost;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const caught = (exception: unknown) => {
    filter.catch(exception, host);
    return json.mock.calls[0][0];
  };

  it('BusinessException의 code와 detail을 그대로 싣는다', () => {
    const body = caught(
      new BusinessException(
        'INVALID_CREDENTIALS',
        '이메일 또는 비밀번호가 올바르지 않습니다.',
        HttpStatus.UNAUTHORIZED,
        { attemptsLeft: 4 },
      ),
    );

    expect(status).toHaveBeenCalledWith(401);
    expect(body).toMatchObject({
      success: false,
      code: 'INVALID_CREDENTIALS',
      message: '이메일 또는 비밀번호가 올바르지 않습니다.',
      statusCode: 401,
      path: '/api/v1/auth/login',
      detail: { attemptsLeft: 4 },
    });
  });

  it('코드가 없는 Nest 기본 예외는 상태 코드로 기본 code를 채운다', () => {
    expect(caught(new NotFoundException('없음'))).toMatchObject({
      code: ErrorCode.NOT_FOUND,
      message: '없음',
      statusCode: 404,
    });
  });

  it('검증 실패의 메시지 배열은 대표 문구 + detail.messages로 나눈다', () => {
    const body = caught(
      new UnprocessableEntityException(['email must be an email', 'weak']),
    );

    expect(body).toMatchObject({
      code: ErrorCode.VALIDATION_FAILED,
      message: 'email must be an email',
      statusCode: 422,
      detail: { messages: ['email must be an email', 'weak'] },
    });
  });

  it('요청 자체가 깨진 400은 VALIDATION_FAILED로 내려간다', () => {
    expect(caught(new BadRequestException('bad'))).toMatchObject({
      code: ErrorCode.VALIDATION_FAILED,
      statusCode: 400,
    });
  });

  it('HttpException이 아닌 예외는 내부 메시지를 노출하지 않는다', () => {
    const body = caught(new Error('select * from users where password = ...'));

    expect(status).toHaveBeenCalledWith(500);
    expect(body).toMatchObject({
      code: ErrorCode.INTERNAL_ERROR,
      message: '서버 오류가 발생했습니다.',
      statusCode: 500,
    });
  });
});
