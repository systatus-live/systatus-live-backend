import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateUsersAvatar1768070568761 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    const userList = await queryRunner.query("select id, name from users");
    for await (let user of userList) {
      await queryRunner.query(`update users set avatar = '/images/avatar.jpg' where id = '${user.id}'`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }

}
