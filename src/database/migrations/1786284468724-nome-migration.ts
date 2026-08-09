import { MigrationInterface, QueryRunner } from "typeorm";

export class NomeMigration1786284468724 implements MigrationInterface {
    name = 'NomeMigration1786284468724'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "request_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid, "method" character varying(6) NOT NULL, "endpoint" character varying(4096) NOT NULL, "payload" text, "status" character varying(3) NOT NULL, "duration_client" integer NOT NULL, "duration_api" integer, "aplication" character varying(512), "platform" character varying(255), "version" character varying(9), "ip" character varying(128), "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1edd3815ae37a9b9511f5a26dca" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "request_logs" ADD CONSTRAINT "FK_b5f9dbba1a152b519ef219b94e1" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "request_logs" DROP CONSTRAINT "FK_b5f9dbba1a152b519ef219b94e1"`);
        await queryRunner.query(`DROP TABLE "request_logs"`);
    }

}
