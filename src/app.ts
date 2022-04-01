import dotenv from 'dotenv';
dotenv.config();
import express, { Request, Response } from 'express';
import responseTime from 'response-time';
import morgan from 'morgan';
import routes from './routes';
import { restResponseTimeHistogram, databaseResponseTimeHistogram } from './utils/metrics';

const app = express();

app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: false }));
app.use(responseTime((req: Request, res: Response, time: number) => {
    if (req?.route?.path) {
        restResponseTimeHistogram.observe({
            method: req.method,
            route: req.route.path,
            status_code: res.statusCode
        }, time * 1000);
    }
}))

app.use('/', routes);


export default app;