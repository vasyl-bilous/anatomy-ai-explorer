import { NotFoundException } from '@nestjs/common';

import type { Region } from '../../shared/contracts/anatomy.contract';
import type { RegionsRepository } from './regions.repository';
import { RegionsService } from './regions.service';

const region: Region = {
  id: 'r1',
  name: "Alzheimer's Disease",
  category: 'Neurological',
  screen: 'body',
  parentId: null,
  markers: [],
};

describe('RegionsService', () => {
  let service: RegionsService;
  let repository: jest.Mocked<Pick<RegionsRepository, 'findMany' | 'findById'>>;

  beforeEach(() => {
    repository = {
      findMany: jest.fn(),
      findById: jest.fn(),
    };
    service = new RegionsService(repository as unknown as RegionsRepository);
  });

  describe('list', () => {
    it('passes the screen filter through to the repository', async () => {
      repository.findMany.mockResolvedValue([region]);

      const result = await service.list('body');

      expect(repository.findMany).toHaveBeenCalledWith('body');
      expect(result).toEqual([region]);
    });

    it('lists all regions when no screen is given', async () => {
      repository.findMany.mockResolvedValue([]);

      await service.list();

      expect(repository.findMany).toHaveBeenCalledWith(undefined);
    });
  });

  describe('getById', () => {
    it('returns the region when found', async () => {
      repository.findById.mockResolvedValue(region);

      await expect(service.getById('r1')).resolves.toEqual(region);
    });

    it('throws NotFoundException when the region is missing', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.getById('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
