import { Test, TestingModule } from '@nestjs/testing';
import { MessagesController } from './message.controller';
import { MessagesService } from '../services/message.service';

describe('MessageController', () => {
  let controller: MessagesController;

  const mockMessagesService = {
    create: jest.fn(),
    findByConversation: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessagesController],
      providers: [
        { provide: MessagesService, useValue: mockMessagesService },
      ],
    }).compile();

    controller = module.get<MessagesController>(MessagesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
