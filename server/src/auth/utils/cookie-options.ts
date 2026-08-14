import { ConfigService } from '@nestjs/config';

export function getRefreshCookieOptions(config: ConfigService) {
  const isProduction = config.get<string>('NODE_ENV') === 'production';
  const expiresInDays = config.getOrThrow<number>(
    'REFRESH_TOKEN_EXPIRES_IN_DAYS',
  );

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: (isProduction ? 'strict' : 'lax') as 'strict' | 'lax',
    path: '/auth',
    maxAge: expiresInDays * 24 * 60 * 60 * 1000,
  };
}
