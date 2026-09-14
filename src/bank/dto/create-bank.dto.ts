import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/** API 명세서 §3 — `POST /banks` */
export class CreateBankDto {
  @ApiProperty({ example: '카카오뱅크' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  bankName: string;

  /**
   * 표기를 정규화하지 않는다. 하이픈을 지워 저장하면 화면에 다시 그릴 때
   * 은행마다 다른 자릿수 규칙을 서버가 알아야 한다 — 입력한 그대로 보여주는 편이
   * 입금하는 사람이 대조하기에도 낫다.
   */
  @ApiProperty({ example: '3333-01-1234567' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  account: string;

  @ApiProperty({ example: '홍길동' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  holder: string;
}
