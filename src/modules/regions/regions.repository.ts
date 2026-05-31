import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import type {
  Region,
  RegionScreen,
} from '../../shared/contracts/anatomy.contract';

// Prisma select that yields exactly the shared `Region` shape (markers ordered
// for stable rendering).
const regionSelect = {
  id: true,
  name: true,
  category: true,
  screen: true,
  parentId: true,
  markers: {
    select: {
      id: true,
      xPct: true,
      yPct: true,
      label: true,
      color: true,
      tooltip: true,
    },
  },
} as const;

@Injectable()
export class RegionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(screen?: RegionScreen): Promise<Region[]> {
    return this.prisma.region.findMany({
      where: screen ? { screen } : undefined,
      orderBy: { sortOrder: 'asc' },
      select: regionSelect,
    });
  }

  findById(id: string): Promise<Region | null> {
    return this.prisma.region.findUnique({
      where: { id },
      select: regionSelect,
    });
  }
}
