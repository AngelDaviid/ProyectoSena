import { DataSource } from 'typeorm';
import { Category } from '../events/entities/categories.entity';

export const seedPostCategories = async (dataSource: DataSource) => {
  const repo = dataSource.getRepository(Category);

  const defaultCategories = [
    { name: 'Tecnología' },
    { name: 'Viajes' },
    { name: 'Fitness' },
    { name: 'Comida' },
    { name: 'Educación' },
  ];

  for (const category of defaultCategories) {
    const exists = await repo.findOne({ where: { name: category.name } });

    if (!exists) {
      await repo.save(repo.create(category));
      console.log(`✔ Categoría creada: ${category.name}`);
    }
  }
};
