import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private isConfigured = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    this.logger.log('🔧 Iniciando configuración de Cloudinary.. .');
    this.logger.log(`📍 NODE_ENV: ${process.env.NODE_ENV || 'development'}`);

    if (!cloudName || !apiKey || !apiSecret) {
      this.logger.error('❌ Cloudinary credentials are missing! ');
      this.logger.error(`   CLOUDINARY_CLOUD_NAME: ${cloudName ?  '✅ SET' : '❌ MISSING'}`);
      this.logger.error(`   CLOUDINARY_API_KEY: ${apiKey ? '✅ SET' : '❌ MISSING'}`);
      this.logger.error(`   CLOUDINARY_API_SECRET: ${apiSecret ? '✅ SET' : '❌ MISSING'}`);
      this.logger.error('');
      this.logger.error('💡 Para configurar Cloudinary:');
      this.logger.error('   1. Ve a https://cloudinary.com/console');
      this.logger.error('   2. Copia tus credenciales');
      this.logger.error('   3.  En LOCAL: crea un archivo .env en SenaProyect/ con las variables');
      this.logger.error('   4. En RENDER: ve a Environment → Environment Variables y agrégalas');
      this.logger. error('');
      throw new Error('Cloudinary credentials not configured.  Check logs above.');
    }

    try {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });

      this.isConfigured = true;
      this.logger.log(`✅ Cloudinary configurado exitosamente`);
      this.logger.log(`   Cloud Name: ${cloudName}`);
      this.logger.log(`   API Key: ${apiKey.substring(0, 6)}...`);
    } catch (error) {
      this.logger.error('❌ Error al configurar Cloudinary:', error);
      throw error;
    }
  }

  async uploadImage(file: Express.Multer.File, folder = 'senaconnect'): Promise<string> {
    if (!this.isConfigured) {
      throw new Error('Cloudinary no está configurado.  Verifica las variables de entorno.');
    }

    if (!file || ! file.buffer) {
      throw new Error('No se recibió ningún archivo o el archivo no tiene buffer');
    }

    this.logger.log('📤 Iniciando carga de imagen a Cloudinary...');
    this.logger.log(`   📁 Carpeta: ${folder}`);
    this.logger.log(`   📄 Archivo: ${file. originalname}`);
    this.logger.log(`   📊 Tamaño: ${(file.size / 1024).toFixed(2)} KB`);
    this.logger.log(`   🎨 Tipo: ${file.mimetype}`);

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
            this.logger. error('❌ Error al subir a Cloudinary:');
            this.logger.error(`   Mensaje: ${error.message}`);
            this.logger.error(`   Detalles:`, error);
            return reject(error);
          }
          if (! result) {
            this.logger.error('❌ No se recibió resultado de Cloudinary');
            return reject(new Error('Upload failed: no result from Cloudinary'));
          }
          this.logger.log(`✅ Imagen subida exitosamente`);
          this.logger.log(`   URL: ${result.secure_url}`);
          this.logger.log(`   Public ID: ${result.public_id}`);
          resolve(result.secure_url);
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  async deleteImage(publicId: string): Promise<void> {
    if (!this. isConfigured) {
      throw new Error('Cloudinary no está configurado');
    }

    try {
      this.logger.log(`🗑️ Eliminando imagen: ${publicId}`);
      const result = await cloudinary.uploader.destroy(publicId);
      this. logger.log(`✅ Imagen eliminada: ${publicId}`, result);
    } catch (error) {
      this.logger.error(`❌ Error al eliminar imagen: ${publicId}`, error);
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

  // Método para verificar la configuración
  isReady(): boolean {
    return this.isConfigured;
  }
}
