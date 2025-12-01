import AppDataSource from '../database/ormconfig';
import { seedDefaultCategories } from './seed-categories';

async function runSeeds() {
  try {
    console.log('⏳ Conectando a la base de datos...');
    await AppDataSource.initialize();
    console.log('✔ Conectado');

    console.log('🌱 Ejecutando seeds...');

    await seedDefaultCategories(AppDataSource);

    console.log('🎉 Seeds ejecutados exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error ejecutando seeds', error);
    process.exit(1);
  }
}

runSeeds();
