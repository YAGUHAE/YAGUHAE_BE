import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { League } from '../league/entities/league.entity';
import { User } from '../user/entities/user.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RefreshToken } from './entities/refresh-token.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { RolesGuard } from './guards/roles.guard';
import { KakaoRedirectFilter } from './filters/kakao-redirect.filter';
import { KakaoAuthGuard } from './guards/kakao-auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';
import { KakaoStrategy } from './strategies/kakao.strategy';

/**
 * access 토큰 서명·검증만 JwtModule 기본 설정으로 둔다.
 * refresh 토큰은 시크릿이 달라 호출 지점에서 옵션으로 넘긴다 — access 시크릿이
 * 유출돼도 그것만으로 장기 세션을 발급할 수 없게 분리한다.
 */
@Module({
  imports: [
    PassportModule,
    // League는 로그인 응답의 leagueId(API 명세서 §1) 때문에 들어와 있다.
    // LeagueModule이 생기면 LeagueService 주입으로 교체한다.
    TypeOrmModule.forFeature([User, RefreshToken, League]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          // 환경변수는 자유 문자열이라 '15m' 같은 ms 표기 리터럴 타입으로 좁혀지지 않는다.
          expiresIn: configService.get<string>(
            'JWT_ACCESS_EXPIRES_IN',
            '15m',
          ) as JwtSignOptions['expiresIn'],
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    KakaoStrategy,
    JwtAuthGuard,
    KakaoAuthGuard,
    RolesGuard,
    RefreshTokenGuard,
    KakaoRedirectFilter,
  ],
  exports: [JwtModule, JwtAuthGuard, RolesGuard, RefreshTokenGuard],
})
export class AuthModule {}
