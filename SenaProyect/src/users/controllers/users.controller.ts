import {Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put} from '@nestjs/common';
import {ApiOperation, ApiResponse} from '@nestjs/swagger';

import {CreateUserDto, UpdateUserDto} from "../dtos/user.dto";
import {UsersService} from "../services/users.service";
import {Profile} from "../entities/profile.entity";
import {Post as PostEntity} from "../../posts/entities/post.entity";

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {
  }

  @ApiResponse({ status: 200, description: 'Get all Users' })
  @ApiOperation({summary: 'Get all users'})
  @Get()
  getUserName() {
    return this.usersService.findAll()
  }

  @ApiOperation({summary: 'Get user by ID'})
  @Get(':id')
  findUser(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.getUserById(id)
  }

  @ApiResponse({ status: 200, description: 'Get user profile by ID', type: Profile })
  @ApiOperation({summary: 'Get user profile by ID'})
  @Get(':id/profile')
  getProfileUser(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.getProfileUser(id)
  }

  @ApiResponse({ status: 200, description: 'Get user profile by ID', type: PostEntity })
  @ApiOperation({summary: 'Get user posts by user ID'})
  @Get(':id/posts')
  getPostUser(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.getPostUser(id)
  }

  @ApiOperation({summary: 'Create a new user'})
  @Post()
  createUser(@Body() body: CreateUserDto) {
    return this.usersService.create(body)
  }

  @ApiOperation({summary: 'Update user by ID'})
  @Put(':id')
  updateUser(@Param('id', ParseIntPipe) id: number, @Body() changes: UpdateUserDto) {
    return this.usersService.update(id, changes);
  }

  @ApiOperation({summary: 'Delete user by ID'})
  @Delete(':id')
  deleteUser(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.delete(id)
  }


}
