# SportFields Monorepo

Repo nay gom 2 project chinh cua he thong dat san:

- `Backend/`: API server cho nen tang dat san bong da
- `Frontend/`: giao dien web React + TypeScript + Vite

## Cau Truc Thu Muc

```text
sportfields/
├── Backend/
└── Frontend/
```

## Yeu Cau Moi Truong

- Node.js 18+
- npm
- PostgreSQL
- Cac bien moi truong cho backend/frontend

## Database

Backend dang dung:

- PostgreSQL
- Sequelize ORM
- Co ho tro `DATABASE_URL` cho moi truong production/deploy

Bien moi truong DB backend chinh:

```env
DB_NAME=your_database_name
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
```

Neu deploy len Render, Supabase hoac dich vu PostgreSQL ben ngoai, co the dung:

```env
DATABASE_URL=postgresql://username:password@host:5432/database
```

Luu y:

- Trong local, backend co logic kiem tra va tao database neu chua ton tai.
- Trong production hoac khi co `DATABASE_URL`, app se bo qua buoc tao DB tu dong.
- Cau hinh chi tiet nam trong `Backend/src/config/database.js` va `Backend/src/config/db.config.js`.

## Chay Backend

```bash
cd Backend
npm install
cp .env.example .env
npm run dev
```

Script chinh:

- `npm run dev`: chay backend voi nodemon
- `npm start`: chay production mode
- `npm test`: chay test

Backend mac dinh entry point tai `Backend/src/index.js`.

## Chay Frontend

```bash
cd Frontend
npm install
cp .env.example .env
npm run dev
```

Script chinh:

- `npm run dev`: chay Vite dev server
- `npm run build`: build production
- `npm run preview`: preview ban build
- `npm run lint`: kiem tra lint

## Setup Nhanh

Mo 2 terminal rieng:

```bash
cd Backend
npm install
npm run dev
```

```bash
cd Frontend
npm install
npm run dev
```

## Bien Moi Truong

- Backend: tham khao `Backend/.env.example`
- Frontend: tham khao `Frontend/.env.example`

Can cau hinh dung cac gia tri nhu database, URL frontend/backend, Cloudinary, Stripe, Google OAuth va cac khoa dich vu lien quan.

## Tai Lieu Co San

- [Backend README](./Backend/README.md)
- [Frontend README](./Frontend/README.md)
- [Frontend Deploy Notes](./Frontend/DEPLOY.md)
- [Backend Docker Compose Dev](./Backend/docker-compose.dev.yml)

## Luu Y

- Repo goc nay la repo gop, khong giu lich su git rieng cua 2 repo cu.
- Neu can tach trien khai, co the deploy `Backend` va `Frontend` doc lap.
