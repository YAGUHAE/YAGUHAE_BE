import { ApiProperty } from '@nestjs/swagger';
import { Bank } from '../entities/bank.entity';

/**
 * API 명세서 §3 · §9 — 계좌 응답.
 *
 * 계좌번호를 마스킹하지 않는다. 이 DTO를 보는 사람은 HOST(계좌 관리)이거나
 * 입금해야 하는 신청자(`LeagueDto.bank`·`GameDetailDto.league.bank`)이고,
 * 둘 다 전체 번호가 필요하다 — 가리면 화면이 제 역할을 못 한다.
 */
export class BankDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: '카카오뱅크' })
  bankName: string;

  @ApiProperty({ example: '3333-01-1234567' })
  account: string;

  @ApiProperty({ example: '홍길동' })
  holder: string;

  static from(bank: Bank): BankDto {
    return {
      id: bank.id,
      bankName: bank.bankName,
      account: bank.account,
      holder: bank.holder,
    };
  }
}
