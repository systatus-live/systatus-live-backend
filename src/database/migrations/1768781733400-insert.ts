import { MigrationInterface, QueryRunner } from "typeorm";

export class Insert1768781733400 implements MigrationInterface {
  name = 'Insert1768781733400'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "plans" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "index" integer NOT NULL, "name" character varying(30) NOT NULL, "description" character varying(500) NOT NULL, "price" numeric NOT NULL, "image" character varying(100) NOT NULL, "monitorQty" integer NOT NULL, "whatsapp" boolean NOT NULL, "slack" boolean NOT NULL, "googleChat" boolean NOT NULL, "email" boolean NOT NULL, "discord" boolean NOT NULL, "customNotification" boolean NOT NULL, "statusPage" boolean NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_253d25dae4c94ee913bc5ec4850" UNIQUE ("name"), CONSTRAINT "PK_3720521a81c7c24fe9b7202ba61" PRIMARY KEY ("id"))`);

    await queryRunner.query(`insert into plans(
      name
      , index
      , description
      , price
      , image
      , "monitorQty"
      , "customNotification"
      , "statusPage"
      , whatsapp
      , slack
      , "googleChat"
      , email
      , discord
    ) values (
      'Andorinha'
      , 0
      , 'Comece a monitorar em minutos e sem cartão de crédito.'
      , 0
      , '/images/bird.png'
      , 5
      , false
      , false
      , false
      , true
      , true
      , true
      , true
    )`);

    await queryRunner.query(`insert into plans(
      name
      , index
      , description
      , price
      , image
      , "monitorQty"
      , "customNotification"
      , "statusPage"
      , whatsapp
      , slack
      , "googleChat"
      , email
      , discord
    ) values (
      'Coruja'
      , 1
      , 'Perfeito para expandir a cobertura de monitoramento.'
      , 89.90
      , '/images/owl.png'
      , 50
      , false
      , true
      , false
      , true
      , true
      , true
      , true
    )`);

    await queryRunner.query(`insert into plans(
      name
      , index
      , description
      , price
      , image
      , "monitorQty"
      , "customNotification"
      , "statusPage"
      , whatsapp
      , slack
      , "googleChat"
      , email
      , discord
    ) values (
      'Águia'
      , 2
      , 'Mais monitoramento, mensagens personalizadas e alertas no WhatsApp.'
      , 149.90
      , '/images/eagle.png'
      , 100
      , true
      , true
      , true
      , true
      , true
      , true
      , true
    )`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
