import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

export interface ApiResponse<T> {
  success: true;
  data: T;
  timestamp: string;
}

/**
 * 성공 응답을 공통 봉투로 감싼다.
 *
 * 컨트롤러·서비스는 원하는 값을 그대로 return 한다. 직접 감싸면 이중 래핑이 된다.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => ({
        success: true as const,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
