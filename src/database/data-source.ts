import 'dotenv/config';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from './typeorm.config';

// CLI 스크립트는 Nest DI 밖에서 실행되므로 여기서만 예외적으로 process.env를 직접 읽는다.
export default new DataSource(
  buildDataSourceOptions({
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    database: process.env.DB_DATABASE ?? 'yaguhae',
    nodeEnv: process.env.NODE_ENV ?? 'development',
  }),
);
