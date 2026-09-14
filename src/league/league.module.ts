import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Bank } from '../bank/entities/bank.entity';
import { League } from './entities/league.entity';
import { LeagueController } from './league.controller';
import { LeagueService } from './league.service';
import { LeagueOwnershipGuard } from './guards/league-ownership.guard';

/**
 * Bank는 bankId 검증과 응답 조인(API 명세서 §4) 때문에 들어와 있다.
 * BankModule을 가져오지 않는 것은 그쪽이 참조 검사 때문에 League를 이미 보고
 * 있어서다 — 서로 가져오면 순환 의존이 된다.
 */
@Module({
  imports: [TypeOrmModule.forFeature([League, Bank]), AuthModule],
  controllers: [LeagueController],
  providers: [LeagueService, LeagueOwnershipGuard],
  exports: [LeagueService],
})
export class LeagueModule {}
