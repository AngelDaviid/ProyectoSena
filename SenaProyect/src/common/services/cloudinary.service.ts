import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor() {
    // ✅ Verificar que las variables existan
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      this.logger.error('❌ Cloudinary credentials are missing! ');
      this.logger.error(`CLOUD_NAME: ${cloudName ?  'SET' : 'MISSING'}`);
      this.logger.error(`API_KEY: ${apiKey ? 'SET' : 'MISSING'}`);
      this.logger.error(`API_SECRET: ${apiSecret ? 'SET' : 'MISSING'}`);
      throw new Error('Cloudinary credentials not configured');
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    this.logger.log(`✅ Cloudinary configured for: ${cloudName}`);
  }

  async uploadImage(file: Express. Multer.File, folder = 'senaconnect'): Promise<string> {
    this.logger.log(`📤 Uploading image to folder: ${folder}`);
    this.logger.log(`📦 File info: ${file.originalname}, size: ${file.size} bytes`);

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          resource_type: 'auto',
          transformation: [
            { width: 1200, height: 1200, crop: 'limit' },
            { quality: 'auto:good' },
          ],
        },
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) {
            this.logger. error('❌ Error uploading to Cloudinary:', error);
            return reject(error);
          }
          if (! result) {
            this.logger.error('❌ Upload failed: no result from Cloudinary');
            return reject(new Error('Upload failed: no result'));
          }
          this.logger.log(`✅ Image uploaded successfully: ${result.secure_url}`);
          resolve(result.secure_url);
        },
      );

      uploadStream. end(file. buffer);
    });
  }

  async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
      this. logger.log(`✅ Image deleted: ${publicId}`);
    } catch (error) {
      this.logger.error(`❌ Error deleting image: ${publicId}`, error);
      throw error;
    }
  }

  extractPublicId(url: string): string | null {
    if (!url || ! url.includes('cloudinary.com')) {
      return null;
    }
    const matches = url.match(/\/v\d+\/(. +)\.\w+$/);
    return matches ? matches[1] : null;
  }
}
