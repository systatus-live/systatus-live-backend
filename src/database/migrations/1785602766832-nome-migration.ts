import { MigrationInterface, QueryRunner } from "typeorm";

export class NomeMigration1785602766832 implements MigrationInterface {
    name = 'NomeMigration1785602766832'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE monitors ALTER COLUMN name TYPE varchar(128) USING name::varchar(128);`);
        await queryRunner.query(`ALTER TABLE integrations ALTER COLUMN name TYPE varchar(128) USING name::varchar(128);`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }
}
