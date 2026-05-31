import { NotFoundException } from '@nestjs/common';

import type { Analysis } from '../../shared/contracts/anatomy.contract';
import { AnalysisController } from './analysis.controller';
import type { AnalysisService } from './analysis.service';

const processing: Analysis = {
  id: 'a1',
  regionId: 'r1',
  status: 'processing',
  result: null,
};

describe('AnalysisController', () => {
  let controller: AnalysisController;
  let service: jest.Mocked<Pick<AnalysisService, 'create' | 'get'>>;

  beforeEach(() => {
    service = { create: jest.fn(), get: jest.fn() };
    controller = new AnalysisController(service as unknown as AnalysisService);
  });

  it('create() forwards regionId and returns the processing job', () => {
    service.create.mockReturnValue(processing);

    const result = controller.create({ regionId: 'r1' });

    expect(service.create).toHaveBeenCalledWith('r1');
    expect(result).toEqual(processing);
  });

  it('get() returns the job when found', () => {
    service.get.mockReturnValue(processing);

    expect(controller.get('a1')).toEqual(processing);
  });

  it('get() throws NotFoundException for an unknown id', () => {
    service.get.mockReturnValue(undefined);

    expect(() => controller.get('missing')).toThrow(NotFoundException);
  });
});
