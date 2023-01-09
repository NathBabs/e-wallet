import { Request, Response, NextFunction } from 'express';

export function asyncWrapper(fn: any) {
  return function (req: Request, res: Response, next: NextFunction) {
    Promise.resolve(fn(req, res, next)).catch(function (err) {
      next(err);
    });
  };
}
