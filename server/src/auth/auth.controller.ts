import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  Get,
  Query,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { getRefreshCookieOptions } from './utils/cookie-options';
import { Public } from './decorators/public.decorator';
import { CurrentUserId } from './decorators/current-user-id.decorator';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { generateOpaqueToken } from './utils/tokens';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private config: ConfigService,
  ) {}

  @Public()
  @Post('sign-up')
  async signUp(
    @Body() dto: SignUpDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, rawRefreshToken, user } =
      await this.authService.signUp(dto, {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      });

    res.cookie(
      'refreshToken',
      rawRefreshToken,
      getRefreshCookieOptions(this.config),
    );

    return { accessToken, user };
  }

  @Public()
  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  async signIn(
    @Body() dto: SignInDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, rawRefreshToken, user } =
      await this.authService.signIn(dto, {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
      });

    res.cookie(
      'refreshToken',
      rawRefreshToken,
      getRefreshCookieOptions(this.config),
    );

    return { accessToken, user };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawRefreshToken = req.cookies?.refreshToken;

    const {
      accessToken,
      rawRefreshToken: newRawToken,
      user,
    } = await this.authService.refresh(rawRefreshToken);

    res.cookie(
      'refreshToken',
      newRawToken,
      getRefreshCookieOptions(this.config),
    );

    return { accessToken, user };
  }

  @Post('sign-out')
  @HttpCode(HttpStatus.OK)
  async signOut(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawRefreshToken = req.cookies?.refreshToken;

    await this.authService.signOut(rawRefreshToken);

    res.clearCookie('refreshToken', { path: '/auth' });

    return { message: 'Signed out successfully' };
  }

  @Post('resend-verification-email')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async resendVerificationEmail(@CurrentUserId() userId: string) {
    await this.authService.sendVerificationEmail(userId);

    return { message: 'Verification email sent' };
  }

  @Public()
  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    await this.authService.verifyEmail(token);

    return { message: 'Email verified successfully' };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto);

    return { message: 'If that email exists, a reset link has been sent' };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto);

    return { message: 'Password reset successfully' };
  }

  @Public()
  @Get('google')
  googleAuth(@Res({ passthrough: true }) res: Response) {
    const clientId = this.config.getOrThrow<string>('GOOGLE_CLIENT_ID');
    const redirectUri = this.config.getOrThrow<string>('GOOGLE_CALLBACK_URL');

    const state = generateOpaqueToken();

    res.cookie('googleOauthState', state, {
      httpOnly: true,
      secure: this.config.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/auth/google',
      maxAge: 5 * 60 * 1000,
    });

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'email profile',
      state,
    });

    res.redirect(
      `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    );
  }

  @Public()
  @Get('google/callback')
  async googleAuthCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') googleError: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const frontendUrl = this.config.getOrThrow<string>('FRONTEND_URL');

    try {
      if (googleError) {
        throw new BadRequestException('Google sign-in was cancelled');
      }

      const storedState = req.cookies?.googleOauthState;

      if (!state || !storedState || state !== storedState) {
        throw new UnauthorizedException('Invalid OAuth state');
      }

      if (!code) {
        throw new BadRequestException('Missing authorization code');
      }

      const googleUser = await this.authService.exchangeGoogleCode(code);

      const { rawRefreshToken } = await this.authService.googleAuth(
        googleUser,
        {
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip,
        },
      );

      res.cookie(
        'refreshToken',
        rawRefreshToken,
        getRefreshCookieOptions(this.config),
      );
      res.clearCookie('googleOauthState', { path: '/auth/google' });

      return res.redirect(`${frontendUrl}/auth/callback`);
    } catch (err) {
      const message =
        err instanceof BadRequestException ||
        err instanceof UnauthorizedException
          ? err.message
          : 'Something went wrong signing in with Google';

      res.clearCookie('googleOauthState', { path: '/auth/google' });

      return res.redirect(
        `${frontendUrl}/auth/callback?error=${encodeURIComponent(message)}`,
      );
    }
  }
}
