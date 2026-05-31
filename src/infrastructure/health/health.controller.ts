import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';

import { SkipResponseTransform } from '../../common/decorators/skip-response-transform.decorator';
import { PrismaHealthIndicator } from './prisma.health';

// Health probes are version-neutral on purpose: orchestrators (k8s, ECS,
// docker HEALTHCHECK) hit a stable path like /api/health/live regardless of
// the rest of the API's versioning scheme.
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaHealthIndicator,
  ) {}

  @Get('live')
  @SkipResponseTransform()
  @HealthCheck()
  live() {
    return this.health.check([async () => ({ live: { status: 'up' } })]);
  }

  @Get('ready')
  @SkipResponseTransform()
  @HealthCheck()
  ready() {
    return this.health.check([() => this.prisma.isHealthy('db')]);
  }
}
