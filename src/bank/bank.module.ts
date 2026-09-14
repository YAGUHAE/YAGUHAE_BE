import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { League } from '../league/entities/league.entity';
import { BankController } from './bank.controller';
import { BankService } from './bank.service';
import { Bank } from './entities/bank.entity';

/**
 * League는 삭제 전 참조 검사(API 명세서 §3) 때문에 들어와 있다.
 * LeagueModule이 생기면 LeagueService 주입으로 교체한다.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Bank, League]), AuthModule],
  controllers: [BankController],
  providers: [BankService],
  exports: [BankService],
})
export class BankModule {}
