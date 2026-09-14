import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * 카카오 인가 페이지로 보내고(엔트리), 돌아온 code를 토큰으로 교환한다(콜백).
 * 두 라우트가 같은 가드를 쓰며 passport가 code 유무로 단계를 구분한다.
 */
@Injectable()
export class KakaoAuthGuard extends AuthGuard('kakao') {}
