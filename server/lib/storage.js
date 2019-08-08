import _ from 'lodash';
import config from './config';
import Cipher from './cipher';

export default class Storage {
  constructor(storageContext) {
    this.storage = storageContext;
    this.cipher = null;

    if (config('ENABLE_CIPHER') === true || config('ENABLE_CIPHER') === 'true') {
      this.cipher = new Cipher(config('CIPHER_PASSWORD'));
    }
  }
}

Storage.prototype.saveReport = (report) =>
  this.storage.read()
    .then((data) => {
      const maxLogs = 20;

      report.assets = null;
      delete report.assets;

      data.deployments = data.deployments || [];
      data.deployments.push(report);
      data.deployments = data.deployments.splice(-maxLogs, maxLogs);

      return this.storage.write(data).then(() => report);
    });

Storage.prototype.getReports = () =>
  this.storage.read()
    .then(data => _.orderBy(data.deployments || [], [ 'date' ], [ 'desc' ]));

Storage.prototype.getData = (raw) =>
  this.storage.read()
    .then((data) => {
      const { exclude, mappings } = data;

      if (this.cipher && !raw) {
        return this.cipher.decrypt(mappings)
          .then(decrypted => ({ exclude, mappings: JSON.parse(decrypted) }));
      }

      return { exclude, mappings };
    });

Storage.prototype.saveMappings = (mappings) =>
  this.storage.read()
    .then((data) => {
      if (this.cipher) {
        return this.cipher.encrypt(JSON.stringify(mappings))
          .then(encrypted => this.storage.write({ ...data, mappings: encrypted }));
      }

      return this.storage.write({ ...data, mappings });
    });

Storage.prototype.saveExclude = (excludes, type) =>
  this.storage.read()
    .then(data => {
      data.exclude = data.exclude || {};
      data.exclude[type] = excludes;
      return data;
    })
    .then(data => this.storage.write(data));

Storage.prototype.getNotified = () =>
  this.storage.read()
    .then(data => data.isNotified);

Storage.prototype.setNotified = () =>
  this.storage.read()
    .then(data => {
      data.isNotified = true;
      return data;
    })
    .then(data => this.storage.write(data));
