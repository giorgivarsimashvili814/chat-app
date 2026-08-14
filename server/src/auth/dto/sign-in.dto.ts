import { Transform } from 'class-transformer';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class SignInDto {
  @Transform(({ value }) => value.trim().toLowerCase())
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  password: string;
}
