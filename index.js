#!/usr/bin/env node

const { program } = require('commander');
const Form = require('inputtools/src/form/Form');
const Logger = require('inputtools/src/logging/Logger');
const DeepData = require('inputtools/src/data/DeepData');
const Server = require('sockettools/src/Server');
const Status = require('sockettools/src/Status');
const Client = require('socket.io-client');

program
  .arguments('<url>')
  .action(async (url) => {
    const server = new Server();
    const socket = server.createClient(Client(url), 'cli', false);

    const logger = new Logger('socketpoint');
    const form = new Form(logger);

    form.field('route', 'input');
    const paramsCollection = form.collection('params', 'Param');
    paramsCollection.field('key', 'input');
    paramsCollection.field('value', 'input');
    paramsCollection.options.repeat = true;

    await form.execute();

    const params = {};
    for (const { key, value } of form.values.params) {
      DeepData.setDeep(params, key, value);
    }

    logger.underline('Request:');
    logger.log(form.values.route);
    logger.data(params);
    let response = null;
    if (form.values.route === 'debug' && params.event) {
      socket.trigger(params.event, params.params);
    } else {
      response = await socket.request(form.values.route, params);
    }

    if (response) {
      logger.underline('Response:');
      if (response.isError()) {
        logger.error(response.status + ' - ' + Status.extract(response.status).join(' | '));
      } else {
        logger.log(response.status + ' - ' + Status.extract(response.status).join(' | '));
      }
      logger.data(response.data);
    }

    socket.realsocket.disconnect(true);
  })
  .parse(process.argv);
