"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        cors: {
            origin: (origin, callback) => {
                if (!origin)
                    return callback(null, true);
                const allowedPatterns = [
                    /^http:\/\/localhost(:\d+)?$/,
                    /^https:\/\/reversi\.lebrere\.fr$/,
                    /^https:\/\/.*\.azurecontainerapps\.io$/,
                ];
                const isAllowed = allowedPatterns.some(pattern => pattern.test(origin));
                callback(null, isAllowed);
            },
            credentials: true,
        },
    });
    const port = process.env.PORT || 3001;
    await app.listen(port);
    console.log(`🎮 Reversi Server running on port ${port}`);
    console.log(`📡 WebSocket server ready for connections`);
}
bootstrap();
//# sourceMappingURL=main.js.map