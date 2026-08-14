import { Injectable } from '@nestjs/common';
import { AuthProvider } from 'generated/prisma/enums';
import { PrismaService } from 'src/prisma/prisma.service';

export interface CreateUserData {
  email: string;
  username: string;
  passwordHash?: string;
  googleId?: string;
  authProvider?: AuthProvider;
  emailVerified?: boolean;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateUserData) {
    return this.prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        passwordHash: data.passwordHash,
        googleId: data.googleId,
        authProvider: data.authProvider ?? AuthProvider.LOCAL,
        emailVerified: data.emailVerified ?? false
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByUsername(username: string) {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByGoogleId(googleId: string) {
    return this.prisma.user.findUnique({ where: { googleId } });
  }

  async markEmailVerified(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { emailVerified: true },
    });
  }
}
