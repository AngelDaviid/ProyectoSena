import { MigrationInterface, QueryRunner } from 'typeorm';

export class NuevaMigracion1761609506664 implements MigrationInterface {
  name = 'NuevaMigracion1761609506664';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "FK_65f22a50e822b2624a3dacdf6e4"`);
    await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "FK_a6772c596aa56971322fae9e6fd"`);

    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN IF EXISTS "eventsId"`);
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN IF EXISTS "cover_image"`);
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN IF EXISTS "postsId"`);

    await queryRunner.query(`ALTER TABLE "categories" ADD "cover_image" character varying(800)`);
    await queryRunner.query(`ALTER TABLE "categories" ADD "postsId" integer`);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_role_enum') THEN
          CREATE TYPE "public"."users_role_enum" AS ENUM ('desarrollador', 'instructor', 'aprendiz');
        END IF;
      END
      $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "role" "public"."users_role_enum" NOT NULL DEFAULT 'aprendiz'
    `);

    await queryRunner.query(`ALTER TABLE "categories" ADD "eventsId" integer`);

    await queryRunner.query(`ALTER TABLE "categories" ADD CONSTRAINT "UQ_8b0be371d28245da6e4f4b61878" UNIQUE ("name")`);

    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN IF EXISTS "description"`);
    await queryRunner.query(`ALTER TABLE "categories" ADD "description" character varying(255) NOT NULL DEFAULT ''`);

    await queryRunner.query(`
      ALTER TABLE "categories"
        ADD CONSTRAINT "FK_a6772c596aa56971322fae9e6fd"
          FOREIGN KEY ("postsId") REFERENCES "posts" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "categories"
        ADD CONSTRAINT "FK_65f22a50e822b2624a3dacdf6e4"
          FOREIGN KEY ("eventsId") REFERENCES "events" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "FK_65f22a50e822b2624a3dacdf6e4"`);
    await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "FK_a6772c596aa56971322fae9e6fd"`);

    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN IF EXISTS "description"`);
    await queryRunner.query(`ALTER TABLE "categories" ADD "description" character varying(800)`);

    await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT IF EXISTS "UQ_8b0be371d28245da6e4f4b61878"`);

    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN IF EXISTS "eventsId"`);
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN IF EXISTS "postsId"`);
    await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN IF EXISTS "cover_image"`);

    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "role"`);
    await queryRunner.query(`DO $$ BEGIN IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_role_enum') THEN DROP TYPE "public"."users_role_enum"; END IF; END $$;`);

    await queryRunner.query(`ALTER TABLE "categories" ADD "cover_image" character varying(800)`);
    await queryRunner.query(`ALTER TABLE "categories" ADD "postsId" integer`);
    await queryRunner.query(`ALTER TABLE "categories" ADD "eventsId" integer`);

    await queryRunner.query(`
      ALTER TABLE "categories"
      ADD CONSTRAINT "FK_a6772c596aa56971322fae9e6fd"
      FOREIGN KEY ("postsId") REFERENCES "posts" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "categories"
      ADD CONSTRAINT "FK_65f22a50e822b2624a3dacdf6e4"
      FOREIGN KEY ("eventsId") REFERENCES "events" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
  }
}
