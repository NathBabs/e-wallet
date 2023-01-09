import dotenv from 'dotenv';
dotenv.config();
import express, { NextFunction, Request, Response } from 'express';
import responseTime from 'response-time';
import cors from 'cors';
import morgan from 'morgan';
import routes from './routes';
import {
  restResponseTimeHistogram,
  databaseResponseTimeHistogram,
} from './utils/metrics';
import { errorHandler } from './exceptions/ErrorHandler';

const app = express();

app.use(
  cors({
    origin: '*',
  })
);
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: false }));
app.use(
  responseTime((req: Request, res: Response, time: number) => {
    if (req?.route?.path) {
      restResponseTimeHistogram.observe(
        {
          method: req.method,
          route: req.route.path,
          status_code: res.statusCode,
        },
        time * 1000
      );
    }
  })
);

app.use('/', routes);
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  errorHandler.handleError(err, res);
});

export default app;
