"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const config_1 = require("prisma/config");
exports.default = (0, config_1.defineConfig)({
    schema: 'prisma/schema.prisma',
    migrations: {
        path: 'prisma/migrations',
    },
    datasource: {
        // No `db` key here – just `url`
        url: (0, config_1.env)('DATABASE_URL'),
        // optional: shadowDatabaseUrl: env<Env>('SHADOW_DATABASE_URL'),
    },
});
