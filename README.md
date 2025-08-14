# Yodha27 Mongo Boilerplate

Express + MongoDB (Mongoose) starter matching your `users` and `content` resources.

## Quick Start

```bash
cp .env.example .env
# edit MONGO_URI and JWT_SECRET
npm install
npm run seed      # creates admin/admin123
npm start         # http://localhost:4000
```

## Routes

- `POST /api/auth/register`  { username, password }
- `POST /api/auth/login`     { username, password } -> { token }
- `GET  /api/me`             (auth) -> current user
- `GET  /api/content/list`   public published content
- `CRUD /api/content`        (auth: admin for create/update/delete)
- `CRUD /api/users`          (auth: admin)

## Collections

### users
- username (unique), passwordHash, role: "admin"|"user", createdAt, updatedAt

### content
- title, body, slug (unique sparse), status: "draft"|"published", authorId, createdAt, updatedAt

## Text Index (optional)
```
db.content.createIndex({ title: "text", body: "text" })
```

## Notes
- JWT required for protected routes: send `Authorization: Bearer <token>`
- Change default admin password after seeding.
