/*!
 * sri sri guru gauranga jayatah
 */

import { Allotment } from '../Allotment';
import { AudioChunk } from '../AudioChunk';
import { FileVersion } from '../FileVersion';
import _ = require('lodash');

interface FileVersionMap {
  [versionKey: string]: FileVersion;
}

export class TrackEditingTask extends Allotment {
  id: string;
  isRestored: boolean;
  chunks: AudioChunk[];
  versions: FileVersionMap;
  timestampImported?: number;

  constructor(id: string, source: Partial<TrackEditingTask>) {
    super(source);
    Object.assign(
      this,
      _.pick(source, 'isRestored', 'chunks', 'versions', 'timestampImported')
    );
    this.id = id;
  }

  public get lastVersion() {
    const lastVersionKey = _.findLastKey(this.versions);
    return lastVersionKey
      ? { id: lastVersionKey, ...this.versions[lastVersionKey] }
      : null;
  }

  public toString(): string {
    return this.id;
  }
}
