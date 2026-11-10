import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UploadsService } from './uploads.service';

function createMockFile(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'photo.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 1024,
    buffer: Buffer.from('fake-image-data'),
    stream: null as any,
    destination: '',
    filename: '',
    path: '',
    ...overrides,
  };
}

describe('UploadsService', () => {
  let service: UploadsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadsService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(undefined),
          },
        },
      ],
    }).compile();

    service = module.get<UploadsService>(UploadsService);
    service.onModuleInit();
  });

  describe('validateFile (via upload)', () => {
    it('debe aceptar image/jpeg', async () => {
      const file = createMockFile({ mimetype: 'image/jpeg', size: 1024 });
      const result = await service.upload(file, 'test');
      expect(result.key).toMatch(/^test\/.+\.jpg$/);
    });

    it('debe aceptar image/png', async () => {
      const file = createMockFile({ mimetype: 'image/png', originalname: 'img.png', size: 1024 });
      const result = await service.upload(file, 'test');
      expect(result.key).toMatch(/\.png$/);
    });

    it('debe aceptar application/pdf', async () => {
      const file = createMockFile({ mimetype: 'application/pdf', originalname: 'doc.pdf', size: 1024 });
      const result = await service.upload(file, 'docs');
      expect(result.key).toMatch(/\.pdf$/);
    });

    it('debe rechazar tipo de archivo no permitido', async () => {
      const file = createMockFile({ mimetype: 'application/exe', size: 1024 });
      await expect(service.upload(file, 'test')).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar text/html', async () => {
      const file = createMockFile({ mimetype: 'text/html', size: 1024 });
      await expect(service.upload(file, 'test')).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar archivo mayor a 5 MB', async () => {
      const file = createMockFile({ size: 6 * 1024 * 1024 });
      await expect(service.upload(file, 'test')).rejects.toThrow(BadRequestException);
    });

    it('debe rechazar archivo nulo', async () => {
      await expect(service.upload(null as any, 'test')).rejects.toThrow(BadRequestException);
    });
  });

  describe('path traversal protection', () => {
    it('debe generar key con folder + UUID', async () => {
      const file = createMockFile();
      const result = await service.upload(file, 'vehicles');
      expect(result.key).toMatch(/^vehicles\/[0-9a-f-]+\.jpg$/);
    });
  });
});
