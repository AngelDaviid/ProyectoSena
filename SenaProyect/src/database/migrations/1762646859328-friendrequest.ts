import { MigrationInterface, QueryRunner } from "typeorm";

export class Friendrequest1762646859328 implements MigrationInterface {
    name = 'Friendrequest1762646859328'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT "FK_65f22a50e822b2624a3dacdf6e4"`);
        await queryRunner.query(`CREATE TYPE "public"."friend_requests_status_enum" AS ENUM('pending', 'accepted', 'rejected')`);
        await queryRunner.query(`CREATE TABLE "friend_requests" ("id" SERIAL NOT NULL, "status" "public"."friend_requests_status_enum" NOT NULL DEFAULT 'pending', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "senderId" integer, "receiverId" integer, CONSTRAINT "PK_3827ba86ce64ecb4b90c92eeea6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_5b1eb1e774384cd6d8c7597418" ON "friend_requests" ("senderId", "receiverId") `);
        await queryRunner.query(`CREATE TABLE "user_friends" ("user_id" integer NOT NULL, "friend_id" integer NOT NULL, CONSTRAINT "PK_657d2355d5000f103ff3612447f" PRIMARY KEY ("user_id", "friend_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_73aac2cba30951ed7c7000c614" ON "user_friends" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_24f1e41a3801477d44228395e3" ON "user_friends" ("friend_id") `);
        await queryRunner.query(`CREATE TABLE "user_blocks" ("blocker_id" integer NOT NULL, "blocked_id" integer NOT NULL, CONSTRAINT "PK_48667515438e7d0f0fed998b193" PRIMARY KEY ("blocker_id", "blocked_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_dfcd8a81016d1de587fbd2d70b" ON "user_blocks" ("blocker_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_7a0806a54f0ad9ced3e247cacd" ON "user_blocks" ("blocked_id") `);
        await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN "eventsId"`);
        await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN "cover_image"`);
        await queryRunner.query(`ALTER TABLE "categories" ADD "cover_image" character varying(800)`);
        await queryRunner.query(`ALTER TABLE "categories" ADD "eventsId" integer`);
        await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "categories" ADD "description" character varying(800)`);
        await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT "UQ_8b0be371d28245da6e4f4b61878"`);
        await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "categories" ADD "description" character varying(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "friend_requests" ADD CONSTRAINT "FK_da724334b35796722ad87d31884" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "friend_requests" ADD CONSTRAINT "FK_97c256506348f9347b3a8a35629" FOREIGN KEY ("receiverId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "categories" ADD CONSTRAINT "FK_65f22a50e822b2624a3dacdf6e4" FOREIGN KEY ("eventsId") REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_friends" ADD CONSTRAINT "FK_73aac2cba30951ed7c7000c6142" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "user_friends" ADD CONSTRAINT "FK_24f1e41a3801477d44228395e3b" FOREIGN KEY ("friend_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_blocks" ADD CONSTRAINT "FK_dfcd8a81016d1de587fbd2d70bf" FOREIGN KEY ("blocker_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "user_blocks" ADD CONSTRAINT "FK_7a0806a54f0ad9ced3e247cacd1" FOREIGN KEY ("blocked_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_blocks" DROP CONSTRAINT "FK_7a0806a54f0ad9ced3e247cacd1"`);
        await queryRunner.query(`ALTER TABLE "user_blocks" DROP CONSTRAINT "FK_dfcd8a81016d1de587fbd2d70bf"`);
        await queryRunner.query(`ALTER TABLE "user_friends" DROP CONSTRAINT "FK_24f1e41a3801477d44228395e3b"`);
        await queryRunner.query(`ALTER TABLE "user_friends" DROP CONSTRAINT "FK_73aac2cba30951ed7c7000c6142"`);
        await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT "FK_65f22a50e822b2624a3dacdf6e4"`);
        await queryRunner.query(`ALTER TABLE "friend_requests" DROP CONSTRAINT "FK_97c256506348f9347b3a8a35629"`);
        await queryRunner.query(`ALTER TABLE "friend_requests" DROP CONSTRAINT "FK_da724334b35796722ad87d31884"`);
        await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "categories" ADD "description" character varying(800)`);
        await queryRunner.query(`ALTER TABLE "categories" ADD CONSTRAINT "UQ_8b0be371d28245da6e4f4b61878" UNIQUE ("name")`);
        await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "categories" ADD "description" character varying(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN "eventsId"`);
        await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN "cover_image"`);
        await queryRunner.query(`ALTER TABLE "categories" ADD "cover_image" character varying(800)`);
        await queryRunner.query(`ALTER TABLE "categories" ADD "eventsId" integer`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7a0806a54f0ad9ced3e247cacd"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_dfcd8a81016d1de587fbd2d70b"`);
        await queryRunner.query(`DROP TABLE "user_blocks"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_24f1e41a3801477d44228395e3"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_73aac2cba30951ed7c7000c614"`);
        await queryRunner.query(`DROP TABLE "user_friends"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5b1eb1e774384cd6d8c7597418"`);
        await queryRunner.query(`DROP TABLE "friend_requests"`);
        await queryRunner.query(`DROP TYPE "public"."friend_requests_status_enum"`);
        await queryRunner.query(`ALTER TABLE "categories" ADD CONSTRAINT "FK_65f22a50e822b2624a3dacdf6e4" FOREIGN KEY ("eventsId") REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
