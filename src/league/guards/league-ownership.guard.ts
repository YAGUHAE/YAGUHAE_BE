import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OwnershipGuard } from '../../auth/guards/ownership.guard';
import { League } from '../entities/league.entity';

/** `PATCH /leagues/:id` — 리그 주최자 본인만 (API 명세서 §4) */
@Injectable()
export class LeagueOwnershipGuard extends OwnershipGuard {
  constructor(
    @InjectRepository(League)
    private readonly leagueRepository: Repository<League>,
  ) {
    super();
  }

  protected async findOwnerId(resourceId: string): Promise<number | undefined> {
    const league = await this.leagueRepository.findOne({
      where: { id: resourceId },
      select: { id: true, hostId: true },
    });

    return league?.hostId;
  }
}
