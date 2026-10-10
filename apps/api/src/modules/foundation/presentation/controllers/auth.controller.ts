import { Body, Controller, Get, Inject, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from '../../application/services/auth.service';
import { AuthGuard } from '@/shared/guards/auth.guard';
import { LoginDto } from '../dto/login.dto';

type ReqCtx = {
  ip?: string;
  headers?: { 'user-agent'?: string };
  user?: { sub?: string; jti?: string };
  socket?: { remoteAddress?: string };
};

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto, @Req() request: ReqCtx) {
    return this.auth.login(dto, {
      ipAddress: request.ip ?? request.socket?.remoteAddress,
      userAgent: request.headers?.['user-agent'],
    });
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@Req() request: ReqCtx) {
    return this.auth.me(request.user?.sub ?? '');
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  logout(@Req() request: ReqCtx) {
    return this.auth.logout(request.user?.jti, request.user?.sub ?? '');
  }
}
