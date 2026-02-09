/**
 * door/api/index.js - Door API entry point
 * Used by Index Node to load all door API handlers
 */

const list = require('./list');
const show = require('./show');
const health = require('./health');

module.exports = {
  list: list.handler,
  show: show.handler,
  health: health.handler,
};
