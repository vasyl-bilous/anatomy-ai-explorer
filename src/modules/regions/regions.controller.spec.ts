import type { Region } from '../../shared/contracts/anatomy.contract';
import { RegionsController } from './regions.controller';
import type { RegionsService } from './regions.service';

const region: Region = {
  id: 'r1',
  name: "Alzheimer's Disease",
  category: 'Neurological',
  screen: 'body',
  parentId: null,
  markers: [],
};

describe('RegionsController', () => {
  let controller: RegionsController;
  let service: jest.Mocked<Pick<RegionsService, 'list' | 'getById'>>;

  beforeEach(() => {
    service = {
      list: jest.fn(),
      getById: jest.fn(),
    };
    controller = new RegionsController(service as unknown as RegionsService);
  });

  it('list() forwards the screen query to the service', async () => {
    service.list.mockResolvedValue([region]);

    const result = await controller.list({ screen: 'body' });

    expect(service.list).toHaveBeenCalledWith('body');
    expect(result).toEqual([region]);
  });

  it('getById() forwards the id param to the service', async () => {
    service.getById.mockResolvedValue(region);

    const result = await controller.getById('r1');

    expect(service.getById).toHaveBeenCalledWith('r1');
    expect(result).toEqual(region);
  });
});
