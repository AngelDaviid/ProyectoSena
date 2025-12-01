import { DataSource } from "typeorm";
import { config } from 'dotenv'

config();

export default new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  synchronize: true,
  logging: false,
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migration/*.ts', 'src/database/migrations/*.ts', 'src/migrations/*.ts'],
  subscribers: [],
});
