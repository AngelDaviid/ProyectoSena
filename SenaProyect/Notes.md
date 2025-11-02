[GET] http://localhost:3001/

Hello World

[GET] http://localhost:3001/ > Return all users (200)

[GET] http://localhost:3001/users/1 > Return user with id 1 (200)
[GET] http://localhost:3001/users/2 > Return user with id 2 (200)
[GET] http://localhost:3001/users/12312312 > Return user with id 12312312 (200)

[POST] http://localhost:3001/users/ > Return the user created (201)

[DELETE] http://localhost:3001/users/:id > Return status user deleted (200)

[PUT] http://localhost:3001/users/:id > Return the user updated (200)


# Docker

docker compose up -d # Start the services in the background
docker compose down # Stop the services
docker compose down -v # Stop the services and remove the volumes
docker compose ps # List the services

# Prompt

Basado en @posts.service.ts y en @posts.controller.ts crea el CRUD para las categorias dentro del modulo @posts.module.ts esta es la estructura

.
├── controllers
│   ├── posts.controller.spec.ts
│   └── posts.controller.ts
├── dto
│   ├── create-post.dto.ts
│   └── update-post.dto.ts
├── entities
│   ├── category.entity.ts
│   └── post.entity.ts
├── posts.module.ts
└── services
├── posts.service.spec.ts
└── posts.service.ts

# For production

npm run build # Build the project
npm run typeorm migration:run # Run the migrations
npm run start:prod # Start the project in production mode


#Database connection (PostgreSQL on Railway)
POSTGRES_HOST = postgres.railway.internal
POSTGRES_PORT = 5432
POSTGRES_DB = railway
POSTGRES_USER = postgres
POSTGRES_PASSWORD = FGqKKRqyQfrdsNmdofjGfcDoaAShrDoz
