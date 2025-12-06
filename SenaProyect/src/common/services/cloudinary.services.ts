import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService. name);

  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    this.logger.log('✅ Cloudinary configured');
  }

  /**
   * Subir imagen a Cloudinary
   */
  async uploadImage(file: Express.Multer.File, folder = 'senaconnect'): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          resource_type: 'auto',
          transformation: [
            { width: 1200, height: 1200, crop: 'limit' }, // Máximo 1200x1200
            { quality: 'auto:good' }, // Optimización automática
            { fetch_format: 'auto' }, // Formato automático (WebP si es soportado)
          ],
        },
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) {
            this.logger.error('Error uploading to Cloudinary:', error);
            return reject(error);
          }
          if (! result) {
            return reject(new Error('Upload failed: no result'));
          }
          this.logger.log(`Image uploaded: ${result.secure_url}`);
          resolve(result.secure_url);
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  /**
   * Eliminar imagen de Cloudinary por public_id
   */
  async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
      this.logger.log(`Image deleted: ${publicId}`);
    } catch (error) {
      this.logger.error('Error deleting from Cloudinary:', error);
      throw error;
    }
  }

  /**
   * Extraer public_id de una URL de Cloudinary
   */
  extractPublicId(url: string): string | null {
    if (!url || !url.includes('cloudinary. com')) {
      return null;
    }

    // Ejemplo: https://res.cloudinary.com/dj7x8k2pm/image/upload/v1234567890/senaconnect/abc123.jpg
    // Extraer: senaconnect/abc123
    const matches = url.match(/\/v\d+\/(. +)\.\w+$/);
    return matches ? matches[1] : null;
  }
}
