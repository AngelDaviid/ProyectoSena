import { DataSource } from 'typeorm';
import { Category } from '../events/entities/categories.entity';

export const seedEventCategories = async (dataSource: DataSource) => {
  const repo = dataSource.getRepository(Category);

  const defaultCategories = [
    { 
      name: 'Conciertos',
      description: 'Eventos musicales y presentaciones en vivo' 
    },
    { 
      name: 'Talleres',
      description: 'Actividades educativas y formativas' 
    },
    { 
      name: 'Deportes',
      description: 'Eventos y actividades deportivas' 
    },
    { 
      name: 'Tecnología',
      description: 'Charlas, workshops y actividades tecnológicas' 
    },
    { 
      name: 'Arte y Cultura',
      description: 'Eventos culturales, arte y exposiciones' 
    },
  ];

  for (const category of defaultCategories) {
    const exists = await repo.findOne({ where: { name: category.name } });

    if (!exists) {
      await repo.save(repo.create(category));
      console.log(`✔ Categoría creada: ${category.name}`);
    } else {
      console.log(`ℹ Ya existe: ${category.name}`);
    }
  }
};
