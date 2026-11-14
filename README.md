# NadhiLearn — Online Course Platform

Starter project Next.js (JavaScript), Tailwind CSS, PostgreSQL (Raw SQL).

## Requirements
- Node.js LTS
- PostgreSQL + pgAdmin 4
- VS Code

## 1. Install dependencies
Open this folder in VS Code, then run:

```bash
npm install
```

## 2. Create PostgreSQL database
In pgAdmin, create a database named `NadhiLearn_db`.
Open Query Tool for that database and execute the full contents of `database.sql`.

## 3. Configure environment
Copy `.env.example` to `.env.local`, then replace `YOUR_POSTGRES_PASSWORD`.
Generate a JWT secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Put the generated value in `JWT_SECRET`.

## 4. Run
```bash
npm run dev
```
Open http://localhost:3000

Test database connection at http://localhost:3000/api/health

## Notes
- `.env.local` contains secrets; never commit it to GitHub.
- `database.sql` is intentionally located outside `/app`, as required by the assignment.
- The homepage currently uses sample course cards. Authentication, admin/teacher/student dashboards, and CRUD modules are the next implementation stages.
- All database access should use parameterized PostgreSQL queries via `pg` (Raw SQL), not an ORM.
