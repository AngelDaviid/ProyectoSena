import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from '../service/auth.service';
import { UsersService } from '../../users/services/users.service';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    generateToken: jest.fn().mockReturnValue('token'),
  };

  const mockUsersService = {
    create: jest.fn().mockImplementation((dto) => ({ id: 1, ...dto })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should register a user and return token', async () => {
    const dto: any = {
      email: 'test@example.com',
      password: 'password123',
      profile: { firstName: 'Test', lastName: 'User' },
    };

    const result = await controller.register(dto);

    expect(result).toHaveProperty('access_token', 'token');
    expect(result.user).toHaveProperty('email', dto.email);
  });
});
