import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from '../../common/services/cloudinary.service';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          cb(new BadRequestException('Solo imágenes permitidas'), false);
        } else {
          cb(null, true);
        }
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    console.log('📤 [UploadsController] Uploading file to Cloudinary.. .');
    console.log('File:', file.originalname, file.size, 'bytes');

    try {
      const url = await this.cloudinaryService.uploadImage(file, 'senaconnect/uploads');
      console.log('✅ Upload successful:', url);
      return { url };
    } catch (error) {
      console.error('❌ Upload failed:', error);
      throw new BadRequestException('Error al subir la imagen');
    }
  }
}
