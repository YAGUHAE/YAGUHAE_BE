import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

/** API 명세서 §1 — `POST /auth/host/login` */
export class HostLoginDto {
  @ApiProperty({ example: 'host@yaguhae.kr' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'super-secret' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
