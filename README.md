# systatus-live back-end

### Database

Gerar migration automática:

```
npm run typeorm migration:generate -- ./src/database/migrations/nome-migration -d ./src/database/dataSource.ts
```

Gerar migration vazia:

```
npm run typeorm migration:generate -- ./src/database/migrations/nome-migration
```