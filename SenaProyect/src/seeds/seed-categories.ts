import { DataSource } from 'typeorm';
import { Category } from '../posts/entities/category.entity';

export const seedDefaultCategories = async (dataSource: DataSource) => {
  const repo = dataSource.getRepository(Category);

  const defaultCategories = [
    { name: 'Tecnología', description: 'Publicaciones relacionadas con tecnología.' },
    { name: 'Programación', description: 'Contenido sobre desarrollo de software.' },
    { name: 'Viajes', description: 'Experiencias y lugares turísticos.' },
    { name: 'Fitness', description: 'Salud, ejercicio y bienestar.' },
    { name: 'Comida', description: 'Recetas, restaurantes y gastronomía.' },
    { name: 'Educación', description: 'Contenido educativo y aprendizaje.' },
  ];

  for (const cat of defaultCategories) {
    const exists = await repo.findOne({ where: { name: cat.name } });

    if (!exists) {
      const newCat = repo.create(cat);
      await repo.save(newCat);
      console.log(`✔ Categoría creada: ${cat.name}`);
    } else {
      console.log(`⚠ Categoría ya existe: ${cat.name}`);
    }
  }

  console.log('🌱 Categorías por defecto insertadas');
};
