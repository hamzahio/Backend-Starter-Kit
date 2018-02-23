// @flow

import { join } from 'path';
import express from 'express';
import graphql from 'express-graphql';
import mongoose from 'mongoose';
import Sequelize from 'sequelize';
import jwt from 'express-jwt';
import flash from 'express-flash';
import compression from 'compression';
import cors from 'cors';
import morgan from 'morgan';
import session from 'express-session';
import connectRedis from 'connect-redis';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import history from 'express-history-api-fallback';
import Raven from 'raven';
import chalk from 'chalk';

import passport from '~/party/passport';
import { client } from '~/party/redis';

import routes from '~/rest';
import schema from '~/graphql';

import {
  PORT, SECRET,
  MONGODB_URI, POSTGRES_URL,
  SENTRY_DSN,
} from './env';

const app = express();

if (process.env.NODE_ENV === 'production') Raven.config(SENTRY_DSN).install();

app.use(compression());
app.use(cors());
app.use(morgan('tiny'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({
  store: new (connectRedis(session))({ client }),
  name: 'sid',
  resave: true,
  saveUninitialized: true,
  secret: SECRET,
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(jwt({ secret: Buffer.from(SECRET, 'base64'), credentialsRequired: false }));

if (process.env.NODE_ENV === 'production') app.use(Raven.requestHandler());

/**
 * @name REST
 */
app.use('/__', routes);

/**
 * @name GraphQL
 */
app.use('/__/graphql', graphql({ schema }));

if (process.env.NODE_ENV === 'production') app.use(Raven.errorHandler());

/**
 * @name static
 */
if (process.env.NODE_ENV === 'production') {
  const root = join(__dirname, '../public');

  app.use(express.static(root));
  app.use(history('index.html', { root }));
}

/**
 * @name server
 */
const server = app.listen(PORT, (): void => {
  console.log(chalk.hex('#009688')(' [*] App: Bootstrap Succeeded.'));
  console.log(chalk.hex('#009688')(` [*] Host: http://localhost:${PORT}/.`));
});

/**
 * @name Mongo
 */
mongoose.connect(MONGODB_URI);
mongoose.connection.once('open', () => console.log(chalk.hex('#009688')(' [*] Mongo: Connection Succeeded.')));
mongoose.connection.on('error', err => console.error(err));

/**
 * @name Postgres
 */
new Sequelize(POSTGRES_URL, { logging: false })
  .authenticate()
  .then(() => console.log(chalk.hex('#009688')(' [*] Postgres: Connection Succeeded.')))
  .catch(err => console.error(err));

export default server;
