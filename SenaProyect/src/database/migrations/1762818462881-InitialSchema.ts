import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1762818462881 implements MigrationInterface {
    name = 'InitialSchema1762818462881'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "profiles" ("id" SERIAL NOT NULL, "name" character varying(255) NOT NULL, "last_name" character varying(255) NOT NULL, "avatar" character varying(255), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_8e520eb4da7dc01d0e190447c8e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "categories" ("id" SERIAL NOT NULL, "name" character varying(255) NOT NULL, "description" character varying(800), "cover_image" character varying(800), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_8b0be371d28245da6e4f4b61878" UNIQUE ("name"), CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "comments" ("id" SERIAL NOT NULL, "content" text NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" integer, "postId" integer, CONSTRAINT "PK_8bf68bc960f2b69e818bdb90dcb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "post_likes" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" integer NOT NULL, "postId" integer, CONSTRAINT "UQ_16008b94aa60582d36a1793cce1" UNIQUE ("user_id", "postId"), CONSTRAINT "PK_e4ac7cb9daf243939c6eabb2e0d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "posts" ("id" SERIAL NOT NULL, "title" character varying(255) NOT NULL, "content" text, "imageUrl" character varying, "summary" character varying(255), "is_draft" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" integer, CONSTRAINT "PK_2829ac61eff60fcec60d7274b9e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "events" ("id" SERIAL NOT NULL, "title" character varying(255) NOT NULL, "description" text NOT NULL, "imageUrl" character varying(500), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "user_id" integer, "category_id" integer NOT NULL, CONSTRAINT "PK_40731c7151fe4be3116e45ddf73" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "message" ("id" SERIAL NOT NULL, "text" character varying NOT NULL, "imageUrl" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "conversationId" integer, "senderId" integer, CONSTRAINT "PK_ba01f0a3e0123651915008bc578" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "conversation" ("id" SERIAL NOT NULL, CONSTRAINT "PK_864528ec4274360a40f66c29845" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."friend_requests_status_enum" AS ENUM('pending', 'accepted', 'rejected')`);
        await queryRunner.query(`CREATE TABLE "friend_requests" ("id" SERIAL NOT NULL, "status" "public"."friend_requests_status_enum" NOT NULL DEFAULT 'pending', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "senderId" integer, "receiverId" integer, CONSTRAINT "PK_3827ba86ce64ecb4b90c92eeea6" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_5b1eb1e774384cd6d8c7597418" ON "friend_requests" ("senderId", "receiverId") `);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('desarrollador', 'instructor', 'aprendiz')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" SERIAL NOT NULL, "email" character varying(255) NOT NULL, "password" character varying(255) NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'aprendiz', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "profile_id" integer, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "REL_23371445bd80cb3e413089551b" UNIQUE ("profile_id"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "posts_categories" ("post_id" integer NOT NULL, "category_id" integer NOT NULL, CONSTRAINT "PK_a2686167392213db0acf82f40cc" PRIMARY KEY ("post_id", "category_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_7aa2cc32acbe04ab0e196977a5" ON "posts_categories" ("post_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_5f604036872bdb8981d298fe3c" ON "posts_categories" ("category_id") `);
        await queryRunner.query(`CREATE TABLE "conversation_participants_users" ("conversationId" integer NOT NULL, "usersId" integer NOT NULL, CONSTRAINT "PK_9f1c273ed200008aaf268bd2f46" PRIMARY KEY ("conversationId", "usersId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_5c03448affaa46a025440e3932" ON "conversation_participants_users" ("conversationId") `);
        await queryRunner.query(`CREATE INDEX "IDX_a236e54f2eb0a63a9527349b5d" ON "conversation_participants_users" ("usersId") `);
        await queryRunner.query(`CREATE TABLE "user_friends" ("user_id" integer NOT NULL, "friend_id" integer NOT NULL, CONSTRAINT "PK_657d2355d5000f103ff3612447f" PRIMARY KEY ("user_id", "friend_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_73aac2cba30951ed7c7000c614" ON "user_friends" ("user_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_24f1e41a3801477d44228395e3" ON "user_friends" ("friend_id") `);
        await queryRunner.query(`CREATE TABLE "user_blocks" ("blocker_id" integer NOT NULL, "blocked_id" integer NOT NULL, CONSTRAINT "PK_48667515438e7d0f0fed998b193" PRIMARY KEY ("blocker_id", "blocked_id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_dfcd8a81016d1de587fbd2d70b" ON "user_blocks" ("blocker_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_7a0806a54f0ad9ced3e247cacd" ON "user_blocks" ("blocked_id") `);
        await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN "cover_image"`);
        await queryRunner.query(`ALTER TABLE "categories" ADD "cover_image" character varying(800)`);
        await queryRunner.query(`ALTER TABLE "categories" ADD "eventsId" integer`);
        await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT "UQ_8b0be371d28245da6e4f4b61878"`);
        await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "categories" ADD "description" character varying(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE "comments" ADD CONSTRAINT "FK_4c675567d2a58f0b07cef09c13d" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "comments" ADD CONSTRAINT "FK_e44ddaaa6d058cb4092f83ad61f" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "post_likes" ADD CONSTRAINT "FK_9b9a7fc5eeff133cf71b8e06a7b" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "post_likes" ADD CONSTRAINT "FK_6999d13aca25e33515210abaf16" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "posts" ADD CONSTRAINT "FK_c4f9a7bd77b489e711277ee5986" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "events" ADD CONSTRAINT "FK_09f256fb7f9a05f0ed9927f406b" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "events" ADD CONSTRAINT "FK_643188b30e049632f80367be4e1" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "message" ADD CONSTRAINT "FK_7cf4a4df1f2627f72bf6231635f" FOREIGN KEY ("conversationId") REFERENCES "conversation"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "message" ADD CONSTRAINT "FK_bc096b4e18b1f9508197cd98066" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "friend_requests" ADD CONSTRAINT "FK_da724334b35796722ad87d31884" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "friend_requests" ADD CONSTRAINT "FK_97c256506348f9347b3a8a35629" FOREIGN KEY ("receiverId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_23371445bd80cb3e413089551bf" FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "categories" ADD CONSTRAINT "FK_65f22a50e822b2624a3dacdf6e4" FOREIGN KEY ("eventsId") REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "posts_categories" ADD CONSTRAINT "FK_7aa2cc32acbe04ab0e196977a56" FOREIGN KEY ("post_id") REFERENCES "posts"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "posts_categories" ADD CONSTRAINT "FK_5f604036872bdb8981d298fe3ce" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "conversation_participants_users" ADD CONSTRAINT "FK_5c03448affaa46a025440e39329" FOREIGN KEY ("conversationId") REFERENCES "conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "conversation_participants_users" ADD CONSTRAINT "FK_a236e54f2eb0a63a9527349b5d6" FOREIGN KEY ("usersId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
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
        await queryRunner.query(`ALTER TABLE "conversation_participants_users" DROP CONSTRAINT "FK_a236e54f2eb0a63a9527349b5d6"`);
        await queryRunner.query(`ALTER TABLE "conversation_participants_users" DROP CONSTRAINT "FK_5c03448affaa46a025440e39329"`);
        await queryRunner.query(`ALTER TABLE "posts_categories" DROP CONSTRAINT "FK_5f604036872bdb8981d298fe3ce"`);
        await queryRunner.query(`ALTER TABLE "posts_categories" DROP CONSTRAINT "FK_7aa2cc32acbe04ab0e196977a56"`);
        await queryRunner.query(`ALTER TABLE "categories" DROP CONSTRAINT "FK_65f22a50e822b2624a3dacdf6e4"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_23371445bd80cb3e413089551bf"`);
        await queryRunner.query(`ALTER TABLE "friend_requests" DROP CONSTRAINT "FK_97c256506348f9347b3a8a35629"`);
        await queryRunner.query(`ALTER TABLE "friend_requests" DROP CONSTRAINT "FK_da724334b35796722ad87d31884"`);
        await queryRunner.query(`ALTER TABLE "message" DROP CONSTRAINT "FK_bc096b4e18b1f9508197cd98066"`);
        await queryRunner.query(`ALTER TABLE "message" DROP CONSTRAINT "FK_7cf4a4df1f2627f72bf6231635f"`);
        await queryRunner.query(`ALTER TABLE "events" DROP CONSTRAINT "FK_643188b30e049632f80367be4e1"`);
        await queryRunner.query(`ALTER TABLE "events" DROP CONSTRAINT "FK_09f256fb7f9a05f0ed9927f406b"`);
        await queryRunner.query(`ALTER TABLE "posts" DROP CONSTRAINT "FK_c4f9a7bd77b489e711277ee5986"`);
        await queryRunner.query(`ALTER TABLE "post_likes" DROP CONSTRAINT "FK_6999d13aca25e33515210abaf16"`);
        await queryRunner.query(`ALTER TABLE "post_likes" DROP CONSTRAINT "FK_9b9a7fc5eeff133cf71b8e06a7b"`);
        await queryRunner.query(`ALTER TABLE "comments" DROP CONSTRAINT "FK_e44ddaaa6d058cb4092f83ad61f"`);
        await queryRunner.query(`ALTER TABLE "comments" DROP CONSTRAINT "FK_4c675567d2a58f0b07cef09c13d"`);
        await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "categories" ADD "description" character varying(800)`);
        await queryRunner.query(`ALTER TABLE "categories" ADD CONSTRAINT "UQ_8b0be371d28245da6e4f4b61878" UNIQUE ("name")`);
        await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN "eventsId"`);
        await queryRunner.query(`ALTER TABLE "categories" DROP COLUMN "cover_image"`);
        await queryRunner.query(`ALTER TABLE "categories" ADD "cover_image" character varying(800)`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7a0806a54f0ad9ced3e247cacd"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_dfcd8a81016d1de587fbd2d70b"`);
        await queryRunner.query(`DROP TABLE "user_blocks"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_24f1e41a3801477d44228395e3"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_73aac2cba30951ed7c7000c614"`);
        await queryRunner.query(`DROP TABLE "user_friends"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a236e54f2eb0a63a9527349b5d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5c03448affaa46a025440e3932"`);
        await queryRunner.query(`DROP TABLE "conversation_participants_users"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5f604036872bdb8981d298fe3c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7aa2cc32acbe04ab0e196977a5"`);
        await queryRunner.query(`DROP TABLE "posts_categories"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5b1eb1e774384cd6d8c7597418"`);
        await queryRunner.query(`DROP TABLE "friend_requests"`);
        await queryRunner.query(`DROP TYPE "public"."friend_requests_status_enum"`);
        await queryRunner.query(`DROP TABLE "conversation"`);
        await queryRunner.query(`DROP TABLE "message"`);
        await queryRunner.query(`DROP TABLE "events"`);
        await queryRunner.query(`DROP TABLE "posts"`);
        await queryRunner.query(`DROP TABLE "post_likes"`);
        await queryRunner.query(`DROP TABLE "comments"`);
        await queryRunner.query(`DROP TABLE "categories"`);
        await queryRunner.query(`DROP TABLE "profiles"`);
    }

}
