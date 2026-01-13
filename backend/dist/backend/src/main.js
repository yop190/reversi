"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        cors: {
            origin: ['http://localhost:4200', 'http://localhost:4201', 'http://localhost'],
            credentials: true,
        },
    });
    const port = process.env.PORT || 3001;
    await app.listen(port);
    console.log(`🎮 Reversi Server running on http://localhost:${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map