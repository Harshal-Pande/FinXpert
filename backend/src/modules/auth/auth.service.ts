import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const advisor = await this.prisma.advisor.findUnique({
      where: { email: loginDto.email },
    });
    if (!advisor || !(await bcrypt.compare(loginDto.password, advisor.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const payload = { sub: advisor.id, email: advisor.email, role: 'advisor' };
    return {
      access_token: this.jwtService.sign(payload),
      advisor: { id: advisor.id, email: advisor.email },
    };
  }

  async validateUser(payload: { sub: string }) {
    return this.prisma.advisor.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true },
    });
  }
}
