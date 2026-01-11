import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateUsers1768150425785 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "avatar" DROP NOT NULL`);
      await queryRunner.query(`update users set avatar = null where 1 = 1`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
