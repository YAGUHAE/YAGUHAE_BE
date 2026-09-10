import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * 인증을 건너뛴다.
 *
 * 지금은 가드를 라우트마다 opt-in으로 붙이므로 쓸 일이 없지만, 나중에 전역
 * 가드로 뒤집을 때 필요한 표시다. 전역 가드가 없는 상태에서 이 데코레이터만
 * 붙이면 아무 일도 일어나지 않는다.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
