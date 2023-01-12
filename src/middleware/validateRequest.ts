import { AnySchema } from 'yup';
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

const validate =
  (schema: AnySchema) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.validate({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      return next();
    } catch (error: any) {
      logger.error(error);
      return res.status(400).send(error.errors);
    }
  };

export default validate;
