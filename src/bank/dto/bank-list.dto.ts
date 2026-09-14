import { ApiProperty } from '@nestjs/swagger';
import { BankDto } from './bank.dto';

/**
 * API 명세서 §3 — `GET /banks`
 *
 * 배열을 그대로 내려주지 않고 객체로 감싼다. 나중에 페이지네이션·집계를 붙일 때
 * 배열 응답은 계약을 깨야만 확장할 수 있다 (§5·§6의 목록 응답도 `items`다).
 */
export class BankListDto {
  @ApiProperty({ type: [BankDto] })
  items: BankDto[];
}
