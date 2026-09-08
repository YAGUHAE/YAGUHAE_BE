import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1788842447852 implements MigrationInterface {
  name = 'InitSchema1788842447852';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "banks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "bank_name" text NOT NULL, "account" text NOT NULL, "holder" text NOT NULL, CONSTRAINT "PK_3975b5f684ec241e3901db62d77" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "leagues" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "host_id" uuid NOT NULL, "bank_id" uuid, "name" text NOT NULL, "region" text NOT NULL, "stadium_name" text NOT NULL, "intro" text, "default_fees" jsonb NOT NULL DEFAULT '{}', CONSTRAINT "PK_2275e1e3e32e9223298c3a0b514" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."game_positions_team_enum" AS ENUM('HOME', 'AWAY')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."game_positions_position_enum" AS ENUM('SP', 'RP', 'C', 'DH', 'FIRST', 'SECOND', 'THIRD', 'SS', 'LF', 'CF', 'RF')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."game_positions_fee_tier_enum" AS ENUM('PITCHER', 'CATCHER', 'FIELDER', 'DH')`,
    );
    await queryRunner.query(
      `CREATE TABLE "game_positions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "game_id" uuid NOT NULL, "team" "public"."game_positions_team_enum" NOT NULL, "position" "public"."game_positions_position_enum" NOT NULL, "capacity" integer NOT NULL, "fee_tier" "public"."game_positions_fee_tier_enum" NOT NULL, "participation_fee" integer NOT NULL, CONSTRAINT "uq_game_positions_game_team_position" UNIQUE ("game_id", "team", "position"), CONSTRAINT "chk_game_positions_fee" CHECK ("participation_fee" >= 0), CONSTRAINT "chk_game_positions_capacity" CHECK ("capacity" > 0), CONSTRAINT "PK_9411028cc549ce546245739a6da" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_game_positions_game" ON "game_positions" ("game_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."game_position_slot_attendance_enum" AS ENUM('PRESENT', 'NO_SHOW')`,
    );
    await queryRunner.query(
      `CREATE TABLE "game_position_slot" ("game_position_id" uuid NOT NULL, "slot_no" smallint NOT NULL, "reservation_id" uuid, "seq" smallint, "participant_name" text, "claimed_at" TIMESTAMP WITH TIME ZONE, "attendance" "public"."game_position_slot_attendance_enum", CONSTRAINT "chk_slot_claim_pair" CHECK (("reservation_id" IS NULL) = ("seq" IS NULL)), CONSTRAINT "chk_slot_attendance_claimed" CHECK ("attendance" IS NULL OR "reservation_id" IS NOT NULL), CONSTRAINT "chk_slot_seq" CHECK ("seq" >= 0), CONSTRAINT "chk_slot_no" CHECK ("slot_no" >= 1), CONSTRAINT "PK_99df54db5a4a6c345ab580f1940" PRIMARY KEY ("game_position_id", "slot_no"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_slot_reservation_seq" ON "game_position_slot" ("reservation_id", "seq") WHERE reservation_id IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_slot_reservation" ON "game_position_slot" ("reservation_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_slot_free" ON "game_position_slot" ("game_position_id", "slot_no") WHERE reservation_id IS NULL`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."reservation_slot_snapshot_team_enum" AS ENUM('HOME', 'AWAY')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."reservation_slot_snapshot_position_enum" AS ENUM('SP', 'RP', 'C', 'DH', 'FIRST', 'SECOND', 'THIRD', 'SS', 'LF', 'CF', 'RF')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."reservation_slot_snapshot_fee_tier_enum" AS ENUM('PITCHER', 'CATCHER', 'FIELDER', 'DH')`,
    );
    await queryRunner.query(
      `CREATE TABLE "reservation_slot_snapshot" ("reservation_id" uuid NOT NULL, "seq" smallint NOT NULL, "team" "public"."reservation_slot_snapshot_team_enum" NOT NULL, "position" "public"."reservation_slot_snapshot_position_enum" NOT NULL, "participant_name" text NOT NULL, "fee_tier" "public"."reservation_slot_snapshot_fee_tier_enum" NOT NULL, "fee" integer NOT NULL, CONSTRAINT "chk_slot_snapshot_fee" CHECK ("fee" >= 0), CONSTRAINT "chk_slot_snapshot_seq" CHECK ("seq" >= 0), CONSTRAINT "PK_f1d3818dbbdf472bf3f618bf2e1" PRIMARY KEY ("reservation_id", "seq"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."reservation_status_history_status_enum" AS ENUM('RESERVED', 'PAYMENT_SUBMITTED', 'APPROVED', 'EXPIRED', 'CANCELLED', 'REJECTED', 'NO_SHOW', 'ATTENDED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."reservation_status_history_actor_enum" AS ENUM('PLAYER', 'HOST', 'SYSTEM')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."reservation_status_history_reason_enum" AS ENUM('NOT_DEPOSITED', 'AMOUNT_MISMATCH', 'DUPLICATE', 'OTHER')`,
    );
    await queryRunner.query(
      `CREATE TABLE "reservation_status_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "reservation_id" uuid NOT NULL, "status" "public"."reservation_status_history_status_enum" NOT NULL, "actor" "public"."reservation_status_history_actor_enum" NOT NULL, "reason" "public"."reservation_status_history_reason_enum", CONSTRAINT "PK_4cab29d490a85ac969e0fac2690" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_status_history_reservation" ON "reservation_status_history" ("reservation_id", "created_at") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."reservations_status_enum" AS ENUM('RESERVED', 'PAYMENT_SUBMITTED', 'APPROVED', 'EXPIRED', 'CANCELLED', 'REJECTED', 'NO_SHOW', 'ATTENDED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."reservations_reject_reason_enum" AS ENUM('NOT_DEPOSITED', 'AMOUNT_MISMATCH', 'DUPLICATE', 'OTHER')`,
    );
    await queryRunner.query(
      `CREATE TABLE "reservations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "game_id" uuid NOT NULL, "reserver_id" uuid NOT NULL, "slot_count" smallint NOT NULL, "total_fee" integer NOT NULL, "depositor_name" text NOT NULL, "status" "public"."reservations_status_enum" NOT NULL DEFAULT 'RESERVED', "reject_reason" "public"."reservations_reject_reason_enum", "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "chk_reservations_reject_reason" CHECK ("status" <> 'REJECTED' OR "reject_reason" IS NOT NULL), CONSTRAINT "chk_reservations_total_fee" CHECK ("total_fee" >= 0), CONSTRAINT "chk_reservations_slot_count" CHECK ("slot_count" >= 1), CONSTRAINT "PK_da95cef71b617ac35dc5bcda243" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_reservations_active_per_game" ON "reservations" ("game_id", "reserver_id") WHERE status IN ('RESERVED', 'PAYMENT_SUBMITTED', 'APPROVED')`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_reservations_created" ON "reservations" ("created_at", "id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_reservations_game_status" ON "reservations" ("game_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_reservations_expire" ON "reservations" ("status", "expires_at") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."games_recommended_level_enum" AS ENUM('L1', 'L2', 'L3', 'L4')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."games_status_enum" AS ENUM('OPEN', 'CLOSED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "games" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "league_id" uuid NOT NULL, "host_id" uuid NOT NULL, "game_date" date NOT NULL, "game_time" TIME NOT NULL, "duration_min" integer NOT NULL DEFAULT '120', "recommended_level" "public"."games_recommended_level_enum", "stadium_name" text, "notice" text, "dugout_home" text, "dugout_away" text, "status" "public"."games_status_enum" NOT NULL DEFAULT 'OPEN', CONSTRAINT "PK_c9b16b62917b5595af982d66337" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_games_league" ON "games" ("league_id", "game_date", "game_time") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_games_datetime" ON "games" ("game_date", "game_time") `,
    );
    await queryRunner.query(
      `CREATE TABLE "evaluations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "game_id" uuid NOT NULL, "evaluator_id" uuid NOT NULL, "evaluatee_id" uuid NOT NULL, "manner_score" integer NOT NULL, "skill_match_score" integer NOT NULL, "punctuality_score" integer NOT NULL, "is_best_player" boolean NOT NULL DEFAULT false, CONSTRAINT "uq_evaluations_game_evaluator_evaluatee" UNIQUE ("game_id", "evaluator_id", "evaluatee_id"), CONSTRAINT "chk_evaluations_not_self" CHECK ("evaluator_id" <> "evaluatee_id"), CONSTRAINT "chk_evaluations_punctuality" CHECK ("punctuality_score" BETWEEN 1 AND 5), CONSTRAINT "chk_evaluations_skill_match" CHECK ("skill_match_score" BETWEEN 1 AND 5), CONSTRAINT "chk_evaluations_manner" CHECK ("manner_score" BETWEEN 1 AND 5), CONSTRAINT "PK_f683b433eba0e6dae7e19b29e29" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_evaluations_best_player" ON "evaluations" ("game_id", "evaluator_id", "is_best_player") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_evaluations_evaluatee" ON "evaluations" ("evaluatee_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_type_enum" AS ENUM('EXPIRING_12H', 'EXPIRING_1H', 'APPROVED', 'REJECTED', 'NO_SHOW_MARKED', 'WAITLIST_PROMOTED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."notifications_send_status_enum" AS ENUM('PENDING', 'SENT', 'FAILED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "type" "public"."notifications_type_enum" NOT NULL, "reservation_id" uuid, "send_status" "public"."notifications_send_status_enum" NOT NULL DEFAULT 'PENDING', "is_read" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_notifications_send_status" ON "notifications" ("send_status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_notifications_user" ON "notifications" ("user_id", "is_read") `,
    );
    await queryRunner.query(
      `CREATE TABLE "refresh_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "user_id" uuid NOT NULL, "token_hash" text NOT NULL, "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL, "revoked_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_a7838d2ba25be1342091b6695f1" UNIQUE ("token_hash"), CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('PLAYER', 'HOST')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_provider_enum" AS ENUM('KAKAO')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_primary_position_enum" AS ENUM('SP', 'RP', 'C', 'DH', 'FIRST', 'SECOND', 'THIRD', 'SS', 'LF', 'CF', 'RF')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_self_level_enum" AS ENUM('L1', 'L2', 'L3', 'L4')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "role" "public"."users_role_enum" NOT NULL, "email" text, "password_hash" text, "provider" "public"."users_provider_enum", "provider_id" text, "nickname" text NOT NULL, "phone" text, "region" text, "primary_position" "public"."users_primary_position_enum", "self_level" "public"."users_self_level_enum", "gamewon_url" text, "uniqueplay_url" text, "no_show_count" integer NOT NULL DEFAULT '0', "is_suspended" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_users_provider_id" ON "users" ("provider_id") WHERE provider_id IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "uq_users_email" ON "users" ("email") WHERE email IS NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "leagues" ADD CONSTRAINT "FK_4378f0af7cf99776eb46d657549" FOREIGN KEY ("host_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "leagues" ADD CONSTRAINT "FK_c3f38eeffde6e13224826169b73" FOREIGN KEY ("bank_id") REFERENCES "banks"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "game_positions" ADD CONSTRAINT "FK_8e8edb09f7e66e059a4a00b0537" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "game_position_slot" ADD CONSTRAINT "FK_c01c84a3467996ac0f8282a811d" FOREIGN KEY ("game_position_id") REFERENCES "game_positions"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "game_position_slot" ADD CONSTRAINT "FK_6bfb2759b677decdc9b50e1a351" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservation_slot_snapshot" ADD CONSTRAINT "FK_aabc7de807ddd71401f491b9b4f" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservation_status_history" ADD CONSTRAINT "FK_2d4af05477181b4ca7128a6cfc3" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservations" ADD CONSTRAINT "FK_89ecad6b921f2956c5a02b282da" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservations" ADD CONSTRAINT "FK_3ac6cb315c41f68254807be368b" FOREIGN KEY ("reserver_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "games" ADD CONSTRAINT "FK_d9201e317f8d77241281b6d0abd" FOREIGN KEY ("league_id") REFERENCES "leagues"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "games" ADD CONSTRAINT "FK_a891bebc6fe73f986d1b45885d0" FOREIGN KEY ("host_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "evaluations" ADD CONSTRAINT "FK_707e2f55b9881534e80dc354566" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "evaluations" ADD CONSTRAINT "FK_04b7768cb02bd4bfd08d3d37e3d" FOREIGN KEY ("evaluator_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "evaluations" ADD CONSTRAINT "FK_099cd919c72418c19dc2be91a1d" FOREIGN KEY ("evaluatee_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" ADD CONSTRAINT "FK_7814037821140da2a093c972336" FOREIGN KEY ("reservation_id") REFERENCES "reservations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_3ddc983c5f7bcf132fd8732c3f4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_7814037821140da2a093c972336"`,
    );
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP CONSTRAINT "FK_9a8a82462cab47c73d25f49261f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "evaluations" DROP CONSTRAINT "FK_099cd919c72418c19dc2be91a1d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "evaluations" DROP CONSTRAINT "FK_04b7768cb02bd4bfd08d3d37e3d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "evaluations" DROP CONSTRAINT "FK_707e2f55b9881534e80dc354566"`,
    );
    await queryRunner.query(
      `ALTER TABLE "games" DROP CONSTRAINT "FK_a891bebc6fe73f986d1b45885d0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "games" DROP CONSTRAINT "FK_d9201e317f8d77241281b6d0abd"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservations" DROP CONSTRAINT "FK_3ac6cb315c41f68254807be368b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservations" DROP CONSTRAINT "FK_89ecad6b921f2956c5a02b282da"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservation_status_history" DROP CONSTRAINT "FK_2d4af05477181b4ca7128a6cfc3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "reservation_slot_snapshot" DROP CONSTRAINT "FK_aabc7de807ddd71401f491b9b4f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "game_position_slot" DROP CONSTRAINT "FK_6bfb2759b677decdc9b50e1a351"`,
    );
    await queryRunner.query(
      `ALTER TABLE "game_position_slot" DROP CONSTRAINT "FK_c01c84a3467996ac0f8282a811d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "game_positions" DROP CONSTRAINT "FK_8e8edb09f7e66e059a4a00b0537"`,
    );
    await queryRunner.query(
      `ALTER TABLE "leagues" DROP CONSTRAINT "FK_c3f38eeffde6e13224826169b73"`,
    );
    await queryRunner.query(
      `ALTER TABLE "leagues" DROP CONSTRAINT "FK_4378f0af7cf99776eb46d657549"`,
    );
    await queryRunner.query(`DROP INDEX "public"."uq_users_email"`);
    await queryRunner.query(`DROP INDEX "public"."uq_users_provider_id"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_self_level_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_primary_position_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_provider_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    await queryRunner.query(`DROP INDEX "public"."idx_notifications_user"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_notifications_send_status"`,
    );
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(
      `DROP TYPE "public"."notifications_send_status_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."notifications_type_enum"`);
    await queryRunner.query(`DROP INDEX "public"."idx_evaluations_evaluatee"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_evaluations_best_player"`,
    );
    await queryRunner.query(`DROP TABLE "evaluations"`);
    await queryRunner.query(`DROP INDEX "public"."idx_games_datetime"`);
    await queryRunner.query(`DROP INDEX "public"."idx_games_league"`);
    await queryRunner.query(`DROP TABLE "games"`);
    await queryRunner.query(`DROP TYPE "public"."games_status_enum"`);
    await queryRunner.query(
      `DROP TYPE "public"."games_recommended_level_enum"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_reservations_expire"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_reservations_game_status"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_reservations_created"`);
    await queryRunner.query(
      `DROP INDEX "public"."uq_reservations_active_per_game"`,
    );
    await queryRunner.query(`DROP TABLE "reservations"`);
    await queryRunner.query(
      `DROP TYPE "public"."reservations_reject_reason_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."reservations_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."idx_status_history_reservation"`,
    );
    await queryRunner.query(`DROP TABLE "reservation_status_history"`);
    await queryRunner.query(
      `DROP TYPE "public"."reservation_status_history_reason_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."reservation_status_history_actor_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."reservation_status_history_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "reservation_slot_snapshot"`);
    await queryRunner.query(
      `DROP TYPE "public"."reservation_slot_snapshot_fee_tier_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."reservation_slot_snapshot_position_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."reservation_slot_snapshot_team_enum"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_slot_free"`);
    await queryRunner.query(`DROP INDEX "public"."idx_slot_reservation"`);
    await queryRunner.query(`DROP INDEX "public"."uq_slot_reservation_seq"`);
    await queryRunner.query(`DROP TABLE "game_position_slot"`);
    await queryRunner.query(
      `DROP TYPE "public"."game_position_slot_attendance_enum"`,
    );
    await queryRunner.query(`DROP INDEX "public"."idx_game_positions_game"`);
    await queryRunner.query(`DROP TABLE "game_positions"`);
    await queryRunner.query(
      `DROP TYPE "public"."game_positions_fee_tier_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."game_positions_position_enum"`,
    );
    await queryRunner.query(`DROP TYPE "public"."game_positions_team_enum"`);
    await queryRunner.query(`DROP TABLE "leagues"`);
    await queryRunner.query(`DROP TABLE "banks"`);
  }
}
