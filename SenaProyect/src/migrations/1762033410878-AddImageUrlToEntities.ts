import { MigrationInterface, QueryRunner } from "typeorm";

export class AddImageUrlToEntities1762033410878 implements MigrationInterface {
  name = 'AddImageUrlToEntities1762033410878'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "FK_65f22a50e822b2624a3dacdf6e4"`);
    await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "FK_a6772c596aa56971322fae9e6fd"`);

    await queryRunner.query(`ALTER TABLE "posts" RENAME COLUMN "cover_image" TO "imageUrl"`);

    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN IF EXISTS "eventsId"`);
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN IF EXISTS "cover_image"`);
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN IF EXISTS "postsId"`);

    await queryRunner.query(`ALTER TABLE "categories" ADD "cover_image" character varying(800)`);
    await queryRunner.query(`ALTER TABLE "categories" ADD "postsId" integer`);

    await queryRunner.query(`ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "imageUrl" character varying`);
    await queryRunner.query(`ALTER TABLE "message" ADD COLUMN IF NOT EXISTS "imageUrl" character varying`);

    await queryRunner.query(`ALTER TABLE "categories" ADD "eventsId" integer`);

    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN IF EXISTS "description"`);
    await queryRunner.query(`ALTER TABLE "categories" ADD "description" character varying(800)`);
    await queryRunner.query(`UPDATE "categories" SET "description" = '' WHERE "description" IS NULL`);
    await queryRunner.query(`ALTER TABLE "categories" ALTER COLUMN "description" TYPE character varying(255)`);
    await queryRunner.query(`ALTER TABLE "categories" ALTER COLUMN "description" SET NOT NULL`);

    await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN IF EXISTS "imageUrl"`);
    await queryRunner.query(`ALTER TABLE "posts" ADD "imageUrl" character varying`);

    await queryRunner.query(`ALTER TABLE "categories" ADD CONSTRAINT "FK_a6772c596aa56971322fae9e6fd" FOREIGN KEY ("postsId") REFERENCES "posts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "categories" ADD CONSTRAINT "FK_65f22a50e822b2624a3dacdf6e4" FOREIGN KEY ("eventsId") REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "FK_65f22a50e822b2624a3dacdf6e4"`);
    await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "FK_a6772c596aa56971322fae9e6fd"`);

    await queryRunner.query(`ALTER TABLE "posts" DROP COLUMN IF EXISTS "imageUrl"`);
    await queryRunner.query(`ALTER TABLE "posts" ADD "imageUrl" character varying(900)`);

    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN IF EXISTS "description"`);
    await queryRunner.query(`ALTER TABLE "categories" ADD "description" character varying(255) NOT NULL DEFAULT ''`);

    await queryRunner.query(`ALTER TABLE "message" DROP COLUMN IF EXISTS "imageUrl"`);
    await queryRunner.query(`ALTER TABLE "events" DROP COLUMN IF EXISTS "imageUrl"`);

    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN IF EXISTS "postsId"`);
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN IF EXISTS "cover_image"`);
    await queryRunner.query(`ALTER TABLE "categories" ADD "postsId" integer`);
    await queryRunner.query(`ALTER TABLE "categories" ADD "cover_image" character varying(800)`);
    await queryRunner.query(`ALTER TABLE "categories" ADD "eventsId" integer`);

    await queryRunner.query(`ALTER TABLE "posts" RENAME COLUMN "imageUrl" TO "cover_image"`);

    // restaurar FKs si son necesarias
    await queryRunner.query(`ALTER TABLE "categories" ADD CONSTRAINT "FK_a6772c596aa56971322fae9e6fd" FOREIGN KEY ("postsId") REFERENCES "posts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "categories" ADD CONSTRAINT "FK_65f22a50e822b2624a3dacdf6e4" FOREIGN KEY ("eventsId") REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
  }

}
