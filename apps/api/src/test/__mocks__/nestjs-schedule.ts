// Mock de @nestjs/schedule para Jest (ESM incompatible con ts-jest)
export const Cron = () => (_target: any, _key: string, descriptor: PropertyDescriptor) => descriptor;
export const CronExpression = {
  EVERY_HOUR: '0 * * * *',
  EVERY_DAY_AT_MIDNIGHT: '0 0 * * *',
  EVERY_MINUTE: '* * * * *',
};
export const ScheduleModule = {
  forRoot: () => ({
    module: class ScheduleModule {},
  }),
};
