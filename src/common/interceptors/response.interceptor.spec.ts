import { ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';
import { ResponseInterceptor } from './response.interceptor';

describe('ResponseInterceptor', () => {
  const interceptor = new ResponseInterceptor<unknown>();
  const context = {} as ExecutionContext;

  const intercept = (value: unknown) =>
    firstValueFrom(
      interceptor.intercept(context, {
        handle: () => of(value),
      }),
    );

  it('핸들러 반환값을 success/data/timestamp 봉투로 감싼다', async () => {
    const result = await intercept({ id: 'abc' });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: 'abc' });
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
  });

  it('null 반환도 그대로 data에 싣는다', async () => {
    await expect(intercept(null)).resolves.toMatchObject({
      success: true,
      data: null,
    });
  });
});
