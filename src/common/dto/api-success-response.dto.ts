// The response envelope is a front/back contract — its canonical definition lives
// in `src/shared/contracts`. Re-exported here so the NestJS side (interceptor,
// swagger) keeps a stable `common/dto` import path.
export type { ApiSuccessResponse } from '../../shared/contracts/anatomy.contract';
