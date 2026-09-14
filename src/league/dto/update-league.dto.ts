import { PartialType } from '@nestjs/swagger';
import { CreateLeagueDto } from './create-league.dto';

/**
 * API 명세서 §4 — `PATCH /leagues/:id`
 *
 * A-8은 리그 정보와 입금 계좌를 한 화면에서 저장하지만 **프론트가 두 번
 * 호출한다** — 계좌는 별도 엔티티이고 리그 소유가 아니라서, 리그 수정 권한으로
 * 남의 계좌를 고칠 수 있게 되면 안 된다 (§3·§4).
 */
export class UpdateLeagueDto extends PartialType(CreateLeagueDto) {}
