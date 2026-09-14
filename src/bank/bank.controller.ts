import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../common/enums';
import { BankService } from './bank.service';
import { BankListDto } from './dto/bank-list.dto';
import { BankDto } from './dto/bank.dto';
import { CreateBankDto } from './dto/create-bank.dto';
import { UpdateBankDto } from './dto/update-bank.dto';

/**
 * API 명세서 §3 — 계좌.
 *
 * 소유권 가드가 없는 것이 이 컨트롤러의 특징이다. `banks`에 `host_id`를 두지
 * 않기로 확정했으므로(ERD §2.3) HOST면 누구나 등록·수정·삭제할 수 있다.
 */
@ApiTags('Banks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.HOST)
@ApiResponse({ status: 403, description: 'FORBIDDEN (role ≠ HOST)' })
@Controller('banks')
export class BankController {
  constructor(private readonly bankService: BankService) {}

  @Get()
  @ApiOperation({
    summary: '등록된 계좌 전체 목록',
    description: '소유자 필터가 없다 — banks에 host_id를 두지 않는다.',
  })
  @ApiResponse({ status: 200, type: BankListDto })
  findAll(): Promise<BankListDto> {
    return this.bankService.findAll();
  }

  @Post()
  @ApiOperation({ summary: '계좌 등록' })
  @ApiResponse({ status: 201, type: BankDto })
  @ApiResponse({ status: 422, description: 'VALIDATION_FAILED' })
  create(@Body() dto: CreateBankDto): Promise<BankDto> {
    return this.bankService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: '계좌 정보 수정' })
  @ApiResponse({ status: 200, type: BankDto })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  @ApiResponse({ status: 422, description: 'VALIDATION_FAILED' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBankDto,
  ): Promise<BankDto> {
    return this.bankService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: '계좌 삭제',
    description: '참조 중인 리그가 하나라도 있으면 409 BANK_IN_USE.',
  })
  @ApiResponse({ status: 204, description: '삭제 완료' })
  @ApiResponse({ status: 404, description: 'NOT_FOUND' })
  @ApiResponse({ status: 409, description: 'BANK_IN_USE' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.bankService.remove(id);
  }
}
