import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { ContactsModule } from "./contacts/contacts.module";
import { HashingModule } from "./hashing/hashing.module";
import { HealthController } from "./health/health.controller";
import { IntrosModule } from "./intros/intros.module";
import { InvitesModule } from "./invites/invites.module";
import { MembersModule } from "./members/members.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { PrismaModule } from "./prisma/prisma.module";
import { RequestsModule } from "./requests/requests.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    HashingModule,
    NotificationsModule,
    AuthModule,
    MembersModule,
    InvitesModule,
    ContactsModule,
    RequestsModule,
    IntrosModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
