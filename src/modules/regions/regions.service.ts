import { Injectable, NotFoundException } from '@nestjs/common';

import type {
  Region,
  RegionScreen,
} from '../../shared/contracts/anatomy.contract';
import { RegionsRepository } from './regions.repository';

@Injectable()
export class RegionsService {
  constructor(private readonly repository: RegionsRepository) {}

  list(screen?: RegionScreen): Promise<Region[]> {
    return this.repository.findMany(screen);
  }

  async getById(id: string): Promise<Region> {
    const region = await this.repository.findById(id);
    if (!region) {
      throw new NotFoundException(`Region "${id}" not found`);
    }
    return region;
  }
}
