import {
  Controller, Get, Post, Put, Patch, Body, Param,
  UseGuards, Request, HttpCode, ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsIn, IsOptional } from 'class-validator';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

export class CreateUserDto {
  @IsString() name: string;
  @IsEmail() email: string;
  @IsString() @MinLength(6) password: string;
  @IsIn(['SUPPORT', 'MANAGER', 'ADMIN']) role: 'SUPPORT' | 'MANAGER' | 'ADMIN';
}

export class UpdateUserDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsIn(['SUPPORT', 'MANAGER', 'ADMIN']) role?: 'SUPPORT' | 'MANAGER' | 'ADMIN';
}

export class ResetPasswordDto {
  @IsString() @MinLength(6) newPassword: string;
}

@ApiTags('Usuários')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Roles('ADMIN')
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  @Roles('ADMIN')
  findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Put(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Patch(':id/activate')
  @Roles('ADMIN')
  activate(@Param('id') id: string) {
    return this.usersService.activate(id);
  }

  @Patch(':id/deactivate')
  @Roles('ADMIN')
  deactivate(@Param('id') id: string, @Request() req) {
    return this.usersService.deactivate(id, req.user.id);
  }

  @Patch(':id/reset-password')
  @HttpCode(200)
  resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
    @Request() req,
  ) {
    // ADMIN pode alterar senha de qualquer usuário
    // Outros perfis só podem alterar a própria senha
    if (req.user.role !== 'ADMIN' && req.user.id !== id) {
      throw new ForbiddenException('Você só pode alterar a sua própria senha');
    }
    return this.usersService.resetPassword(id, dto.newPassword);
  }
}
