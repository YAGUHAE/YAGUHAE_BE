import { PartialType } from '@nestjs/swagger';
import { CreateBankDto } from './create-bank.dto';

/**
 * API 명세서 §3 — `PATCH /banks/:id`
 *
 * 전 필드가 선택이지만 빈 객체도 허용한다 — 응답이 항상 현재 계좌이므로
 * 아무것도 바뀌지 않은 요청이 에러일 이유가 없다.
 */
export class UpdateBankDto extends PartialType(CreateBankDto) {}
