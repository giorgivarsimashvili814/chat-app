import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'src/prisma/prisma.service';

interface CreateSessionData {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string;
  ipAddress?: string;
}

@Injectable()
export class SessionsService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateSessionData) {
    return this.prisma.session.create({ data });
  }

  async findByTokenHash(tokenHash: string) {
    return this.prisma.session.findUnique({ where: { tokenHash } });
  }

  async findById(id: string) {
    return this.prisma.session.findUnique({ where: { id } });
  }

  async findActiveByUserId(userId: string) {
    return this.prisma.session.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async revoke(id: string) {
    return this.prisma.session.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string) {
    return this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async deleteExpired() {
    return this.prisma.session.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleExpiredSessionsCleanup() {
    await this.deleteExpired();
  }
}
