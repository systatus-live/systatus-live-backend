import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterUsersTable1731247276175 implements MigrationInterface {
    name = 'AlterUsersTable1731247276175'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "confirmation_code" character varying(10)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "confirmation_code"`);
    }

}
