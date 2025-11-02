import { Controller, Get, Post, Body, Put, Param, Delete, ParseIntPipe } from '@nestjs/common';
import {ApiOperation, ApiResponse} from '@nestjs/swagger';

import { CategoriesService } from '../services/categories.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { PostsService } from '../services/posts.service';
import { Category} from "../entities/category.entity";
import { Post as PostEntity } from "../entities/post.entity";


@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly postsService: PostsService,
  ) {}

  @ApiOperation({ summary: 'Create a new category' })
  @Post()
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @ApiOperation({ summary: 'Get all categories' })
  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @ApiResponse({ status: 200, description: 'Get all categories', type: Category })
  @ApiOperation({ summary: 'Get a category by ID'})
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.findOne(id);
  }

  @ApiResponse({ status: 200, description: 'Get all categories', type: PostEntity })
  @ApiOperation({ summary: 'Get posts by category ID' })
  @Get(':id/posts')
  getCategoryPosts(@Param('id', ParseIntPipe) id: number) {
    return this.postsService.getPostsByCategory(id);
  }


  @ApiOperation({ summary: 'Update a category by ID' })
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateCategoryDto: UpdateCategoryDto) {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @ApiOperation({ summary: 'Delete a category by ID' })
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categoriesService.remove(id);
  }
}
