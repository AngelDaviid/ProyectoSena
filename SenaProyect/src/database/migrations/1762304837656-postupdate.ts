import { MigrationInterface, QueryRunner } from "typeorm";

export class Postupdate1762304837656 implements MigrationInterface {
    name = 'Postupdate1762304837656'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT "FK_65f22a50e822b2624a3dacdf6e4"`);
        await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN "eventsId"`);
        await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN "cover_image"`);
        await queryRunner.query(`ALTER TABLE "categories" ADD "cover_image" character varying(800)`);
        await queryRunner.query(`ALTER TABLE "categories" ADD "eventsId" integer`);
        await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "categories" ADD "description" character varying(800)`);
        await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT "UQ_8b0be371d28245da6e4f4b61878"`);
        await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "categories" ADD "description" character varying(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "categories" ADD CONSTRAINT "FK_65f22a50e822b2624a3dacdf6e4" FOREIGN KEY ("eventsId") REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT "FK_65f22a50e822b2624a3dacdf6e4"`);
        await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "categories" ADD "description" character varying(800)`);
        await queryRunner.query(`ALTER TABLE "categories" ADD CONSTRAINT "UQ_8b0be371d28245da6e4f4b61878" UNIQUE ("name")`);
        await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "categories" ADD "description" character varying(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN "eventsId"`);
        await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN "cover_image"`);
        await queryRunner.query(`ALTER TABLE "categories" ADD "cover_image" character varying(800)`);
        await queryRunner.query(`ALTER TABLE "categories" ADD "eventsId" integer`);
        await queryRunner.query(`ALTER TABLE "categories" ADD CONSTRAINT "FK_65f22a50e822b2624a3dacdf6e4" FOREIGN KEY ("eventsId") REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
