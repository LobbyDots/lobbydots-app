import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  // CORS: permite que la app web (Metro en :8081) llame a la API. La auth sigue
  // exigiendo JWT, así que CORS no abre nada por sí solo. En prod, restringe origin.
  app.enableCors();
  // La validación de entrada se hace con un ZodValidationPipe propio (ver F1),
  // alimentado por los esquemas de @lobbydots/shared.

  const port = Number(process.env.API_PORT ?? 3000);
  await app.listen(port);
  Logger.log(`Lobbydots API escuchando en :${port}`, "Bootstrap");
}

void bootstrap();
