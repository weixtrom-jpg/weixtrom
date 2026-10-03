import {
  Injectable,
  BadRequestException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import * as path from 'path';
import * as fs from 'fs/promises';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

@Injectable()
export class UploadsService implements OnModuleInit {
  private readonly logger = new Logger(UploadsService.name);
  private s3: S3Client | null = null;
  private bucket: string;
  private endpoint: string;
  private useLocalFallback = false;
  private localUploadDir: string;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const endpoint = this.config.get<string>('S3_ENDPOINT');
    const region = this.config.get<string>('S3_REGION');
    const bucket = this.config.get<string>('S3_BUCKET');
    const accessKey = this.config.get<string>('S3_ACCESS_KEY');
    const secretKey = this.config.get<string>('S3_SECRET_KEY');

    if (endpoint && bucket && accessKey && secretKey) {
      this.s3 = new S3Client({
        endpoint,
        region: region || 'us-east-1',
        credentials: {
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
        },
        forcePathStyle: true, // Required for MinIO / S3-compatible
      });
      this.bucket = bucket;
      this.endpoint = endpoint;
      this.logger.log(`S3 storage configured: ${endpoint}/${bucket}`);
    } else {
      this.useLocalFallback = true;
      this.localUploadDir = path.resolve(process.cwd(), 'uploads');
      this.logger.warn(
        'S3 not configured — using local disk fallback (uploads/). ' +
          'Set S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY for production.',
      );
    }
  }

  async upload(
    file: Express.Multer.File,
    folder: string,
  ): Promise<{ url: string; key: string }> {
    this.validateFile(file);

    const ext = this.getExtension(file.originalname, file.mimetype);
    const key = `${folder}/${randomUUID()}.${ext}`;

    if (this.useLocalFallback) {
      return this.uploadLocal(file, key);
    }

    return this.uploadS3(file, key);
  }

  async delete(key: string): Promise<void> {
    if (this.useLocalFallback) {
      return this.deleteLocal(key);
    }

    return this.deleteS3(key);
  }

  // ─── Private ───────────────────────────────────

  private validateFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo.');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de archivo no permitido: ${file.mimetype}. ` +
          `Permitidos: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `El archivo excede el tamaño máximo de 5 MB (${(file.size / 1024 / 1024).toFixed(2)} MB).`,
      );
    }
  }

  private getExtension(_originalName: string, mimetype: string): string {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'application/pdf': 'pdf',
    };
    return mimeToExt[mimetype] || 'bin';
  }

  private async uploadS3(
    file: Express.Multer.File,
    key: string,
  ): Promise<{ url: string; key: string }> {
    await this.s3!.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const url = `${this.endpoint}/${this.bucket}/${key}`;
    return { url, key };
  }

  private async deleteS3(key: string): Promise<void> {
    await this.s3!.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  private async uploadLocal(
    file: Express.Multer.File,
    key: string,
  ): Promise<{ url: string; key: string }> {
    const filePath = path.resolve(this.localUploadDir, key);
    if (!filePath.startsWith(path.resolve(this.localUploadDir) + path.sep)) {
      throw new BadRequestException('Ruta de archivo inválida.');
    }
    const dir = path.dirname(filePath);

    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, file.buffer);

    const url = `/uploads/${key}`;
    return { url, key };
  }

  private async deleteLocal(key: string): Promise<void> {
    const filePath = path.resolve(this.localUploadDir, key);
    if (!filePath.startsWith(path.resolve(this.localUploadDir) + path.sep)) {
      throw new BadRequestException('Ruta de archivo inválida.');
    }
    try {
      await fs.unlink(filePath);
    } catch (error: unknown) {
      const err = error as NodeJS.ErrnoException;
      if (err.code !== 'ENOENT') throw error;
      // File already gone — not an error
    }
  }
}
