import { MigrationInterface, QueryRunner } from "typeorm";

export class NomeMigration1785599309437 implements MigrationInterface {
  name = 'NomeMigration1785599309437'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "status_pages" DROP CONSTRAINT "FK_9003fb143d6748a7787c6789e91"`);
    await queryRunner.query(`ALTER TABLE "status_pages" ADD CONSTRAINT "FK_9003fb143d6748a7787c6789e91" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
