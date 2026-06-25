import { Module } from "@nestjs/common";
import { MatchingService } from "../matching/matching.service";
import { RequestsController } from "./requests.controller";
import { RequestsService } from "./requests.service";

@Module({
  controllers: [RequestsController],
  providers: [RequestsService, MatchingService],
  exports: [MatchingService],
})
export class RequestsModule {}
