import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthProvider, Prisma, User } from 'generated/prisma/client';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { SessionsService } from '../sessions/sessions.service';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { generateOpaqueToken, hashToken } from './utils/tokens';
import { addDays, addHours } from 'date-fns';
import { sanitizeUser } from './utils/sanitize-user';
import { MailerService } from 'src/mailer/mailer.service';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import {
  adjectives,
  animals,
  NumberDictionary,
  uniqueNamesGenerator,
} from 'unique-names-generator';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private users: UsersService,
    private sessions: SessionsService,
    private jwt: JwtService,
    private config: ConfigService,
    private mailer: MailerService,
  ) {}

  async signUp(
    dto: SignUpDto,
    meta: { userAgent?: string; ipAddress?: string },
  ) {
    const [existingEmail, existingUsername] = await Promise.all([
      this.users.findByEmail(dto.email),
      this.users.findByUsername(dto.username),
    ]);

    if (existingEmail) throw new BadRequestException('Email already in use');
    if (existingUsername)
      throw new BadRequestException('Username already in use');

    const passwordHash = await argon2.hash(dto.password);

    let user: User;
    try {
      user = await this.users.create({
        email: dto.email,
        username: dto.username,
        passwordHash,
      });
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new BadRequestException('Email or username already in use');
      }
      throw err;
    }

    await this.sendVerificationEmailForUser(user);

    return this.createSession(user, meta);
  }

  async signIn(
    dto: SignInDto,
    meta: { userAgent?: string; ipAddress?: string },
  ) {
    const user = await this.users.findByEmail(dto.email);

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.createSession(user, meta);
  }

  async refresh(rawRefreshToken: string | undefined) {
    if (!rawRefreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }

    const tokenHash = hashToken(rawRefreshToken);
    const session = await this.sessions.findByTokenHash(tokenHash);

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (session.revokedAt) {
      await this.sessions.revokeAllForUser(session.userId);
      throw new UnauthorizedException('Session revoked');
    }

    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const newRawToken = generateOpaqueToken();
    const newTokenHash = hashToken(newRawToken);
    const expiresAt = addDays(
      new Date(),
      this.config.getOrThrow<number>('REFRESH_TOKEN_EXPIRES_IN_DAYS'),
    );

    await this.prisma.$transaction(async (tx) => {
      const created = await tx.session.create({
        data: {
          userId: session.userId,
          tokenHash: newTokenHash,
          expiresAt,
          userAgent: session.userAgent,
          ipAddress: session.ipAddress,
        },
      });

      const result = await tx.session.updateMany({
        where: { id: session.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      if (result.count === 0) {
        throw new UnauthorizedException('Session reuse detected');
      }
    });

    const user = await this.users.findById(session.userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const accessToken = await this.jwt.signAsync({ sub: user.id });

    return {
      accessToken,
      rawRefreshToken: newRawToken,
      user: sanitizeUser(user),
    };
  }

  async signOut(rawRefreshToken: string | undefined) {
    if (!rawRefreshToken) return;

    const tokenHash = hashToken(rawRefreshToken);
    const session = await this.sessions.findByTokenHash(tokenHash);

    if (session) {
      await this.sessions.revoke(session.id);
    }
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.users.findByEmail(dto.email);
    if (!user || !user.passwordHash) {
      return;
    }

    await this.prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    const rawToken = generateOpaqueToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = addHours(new Date(), 1);

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    await this.mailer.sendPasswordResetEmail(user.email, rawToken);
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = hashToken(dto.token);
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!record || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await argon2.hash(dto.newPassword);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: {
          passwordHash,
          emailVerified: true,
        },
      }),
      this.prisma.emailVerificationToken.deleteMany({
        where: { userId: record.userId },
      }),
      this.prisma.passwordResetToken.delete({ where: { id: record.id } }),
      this.prisma.session.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  async sendVerificationEmail(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException();
    return this.sendVerificationEmailForUser(user);
  }

  async verifyEmail(rawToken: string) {
    const tokenHash = hashToken(rawToken);
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
    });

    if (!record || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerified: true },
      }),
      this.prisma.emailVerificationToken.delete({
        where: { id: record.id },
      }),
    ]);
  }

  async exchangeGoogleCode(code: string) {
    const clientId = this.config.getOrThrow<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.config.getOrThrow<string>('GOOGLE_CLIENT_SECRET');
    const redirectUri = this.config.getOrThrow<string>('GOOGLE_CALLBACK_URL');

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      throw new UnauthorizedException(
        'Failed to exchange Google authorization code',
      );
    }

    const tokenData = await tokenRes.json();
    const googleAccessToken = tokenData.access_token;

    const profileRes = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: { Authorization: `Bearer ${googleAccessToken}` },
      },
    );

    if (!profileRes.ok) {
      throw new UnauthorizedException('Failed to fetch Google profile');
    }

    const profile = await profileRes.json();

    if (!profile.verified_email) {
      throw new UnauthorizedException('Google account email is not verified');
    }

    return {
      googleId: profile.id,
      email: profile.email,
    };
  }

  async googleAuth(
    googleUser: { googleId: string; email: string },
    meta: { userAgent?: string; ipAddress?: string },
  ) {
    const email = googleUser.email.trim().toLowerCase();

    let user = await this.users.findByGoogleId(googleUser.googleId);

    if (!user) {
      const existingByEmail = await this.users.findByEmail(email);

      if (existingByEmail) {
        throw new BadRequestException(
          'An account with this email already exists. Please sign in with your password.',
        );
      }

      user = await this.users.create({
        email,
        username: await this.generateUniqueUsername(),
        googleId: googleUser.googleId,
        authProvider: AuthProvider.GOOGLE,
        emailVerified: true,
      });
    }

    return this.createSession(user, meta);
  }

  async deleteExpiredTokens() {
    const now = new Date();

    const [expiredVerification, expiredResets] = await Promise.all([
      this.prisma.emailVerificationToken.deleteMany({
        where: { expiresAt: { lt: now } },
      }),
      this.prisma.passwordResetToken.deleteMany({
        where: { expiresAt: { lt: now } },
      }),
    ]);

    return {
      verificationDeleted: expiredVerification.count,
      resetDeleted: expiredResets.count,
    };
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleExpiredTokensCleanup() {
    await this.deleteExpiredTokens();
  }

  private async generateUniqueUsername(): Promise<string> {
    const numberDictionary = NumberDictionary.generate({ min: 100, max: 9999 });
    let candidate: string;

    do {
      candidate = uniqueNamesGenerator({
        dictionaries: [adjectives, animals, numberDictionary],
        separator: '_',
        length: 3,
        style: 'lowerCase',
      });
    } while (await this.users.findByUsername(candidate));

    return candidate;
  }

  private async sendVerificationEmailForUser(user: User) {
    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    await this.prisma.emailVerificationToken.deleteMany({
      where: { userId: user.id },
    });

    const rawToken = generateOpaqueToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = addHours(new Date(), 24);

    await this.prisma.emailVerificationToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    await this.mailer.sendVerificationEmail(user.email, rawToken);
  }

  private async createSession(
    user: User,
    meta: { userAgent?: string; ipAddress?: string },
  ) {
    const rawRefreshToken = generateOpaqueToken();
    const tokenHash = hashToken(rawRefreshToken);
    const expiresAt = addDays(
      new Date(),
      this.config.getOrThrow<number>('REFRESH_TOKEN_EXPIRES_IN_DAYS'),
    );

    await this.sessions.create({
      userId: user.id,
      tokenHash,
      expiresAt,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
    });

    const accessToken = await this.jwt.signAsync({ sub: user.id });

    return {
      accessToken,
      rawRefreshToken,
      user: sanitizeUser(user),
    };
  }
}
