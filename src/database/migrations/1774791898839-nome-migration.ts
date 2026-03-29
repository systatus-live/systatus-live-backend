import { MigrationInterface, QueryRunner } from "typeorm";

export class NomeMigration1774791898839 implements MigrationInterface {
  name = 'NomeMigration1774791898839'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TYPE "public"."users_person_type_enum" AS ENUM('PF', 'PJ')`);
    await queryRunner.query(`ALTER TABLE "users" ADD "person_type" "public"."users_person_type_enum"`);
    await queryRunner.query(`ALTER TABLE "users" ADD "document" character varying(18)`);
    await queryRunner.query(`ALTER TABLE "users" ADD "zip_code" character varying(9)`);
    await queryRunner.query(`ALTER TABLE "users" ADD "address" character varying(255)`);
    await queryRunner.query(`ALTER TABLE "users" ADD "neighborhood" character varying(100)`);
    await queryRunner.query(`ALTER TABLE "users" ADD "city" character varying(100)`);
    await queryRunner.query(`ALTER TABLE "users" ADD "country" character varying(100)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
