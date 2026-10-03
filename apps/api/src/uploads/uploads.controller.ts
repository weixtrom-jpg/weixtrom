import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UploadsService } from './uploads.service';

const FOLDER_REGEX = /^[a-zA-Z0-9_-]+$/;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

@ApiTags('Uploads')
@Controller('uploads')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadsController {
  constructor(private uploads: UploadsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Subir un archivo (imagen o PDF)' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({ name: 'folder', required: false, type: String })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_SIZE } }))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string,
  ) {
    const sanitizedFolder = folder || 'general';
    if (!FOLDER_REGEX.test(sanitizedFolder)) {
      throw new BadRequestException(
        'El nombre de carpeta solo puede contener letras, números, guiones y guiones bajos.',
      );
    }
    return this.uploads.upload(file, sanitizedFolder);
  }
}
