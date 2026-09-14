import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Evaluation } from '../evaluation/entities/evaluation.entity';
import { User } from './entities/user.entity';
import { UserController } from './user.controller';
import { UserService } from './user.service';

/**
 * Evaluation은 공개 프로필의 평가 집계(API 명세서 §2) 때문에 들어와 있다.
 * EvaluationModule이 생기면 EvaluationService 주입으로 교체한다.
 */
@Module({
  imports: [TypeOrmModule.forFeature([User, Evaluation]), AuthModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
