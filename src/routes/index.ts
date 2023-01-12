import express from 'express';

const router = express.Router();

import fs from 'fs';
import path from 'path';

const basename = path.basename(__filename);

fs.readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      (file.slice(-3) === '.ts' || file.slice(-3) === '.js')
    );
  })
  .map(file => router.use(require(`./${file}`)));

export default router;
