import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterUsers1767930495557 implements MigrationInterface {
  name = 'AlterUsers1767930495557'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "avatar" text NULL`);

    const userList = await queryRunner.query("select id, name from users");
    for await (let user of userList) {
      await queryRunner.query(`update users set avatar = 'https://ui-avatars.com/api?name=${user.name}&background=random&color=fff' where id = '${user.id}'`);
    }

    await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "avatar" SET NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
