# TODO: Add Shared DB Dependency to User Service

## Tasks

- [x] Update package.json (kept as "file:../database" since workspace:\* not supported by npm)
- [ ] Run npm install in user-service directory
- [x] Update import in userController.ts to import { prisma } from 'database'
- [ ] Test by restarting the service and trying login
