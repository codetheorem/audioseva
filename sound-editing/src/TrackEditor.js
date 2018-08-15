/*
 * sri sri guru gauranga jayatah
 */

import { Devotee } from './Devotee';
import { DriveUtils } from './DriveUtils';

const FLAC_MIME_TYPE = 'audio/flac';

const COLUMNS = {
  DateGiven: 'Date Given',
  Status: 'Status',
  OutputFileName: 'Output File Name',
  EditedFileLink: 'Edited File Link',
  SoundQualityRating: 'Sound Quality Rating'
};

const STATUSES = {
  Given: 'Given',
  WIP: 'WIP',
  Done: 'Done'
};

export class TrackEditor extends Devotee {
  get tasksTable() {
    return new Sheetfu.Table(
      this.spreadsheet.getSheets()[0].getDataRange(),
      COLUMNS.OutputFileName
    );
  }

  processUploads() {
    console.log('Processing uploads for %s.', this.name);
    const files = this.uploadsFolder.searchFiles(`mimeType = '${FLAC_MIME_TYPE}'`);

    while (files.hasNext()) {
      const file = files.next();
      console.log('Processing “%s”.', file.getName());

      const taskId = file.getName().replace(/\.flac$/, '');

      // Finding corresponding task
      const task = this.tasksTable.getItemById(taskId);
      if (task) {
        switch (task.getFieldValue(COLUMNS.Status)) {
          case STATUSES.Done:
            super.sendEmailToDevotee(
              `Task “${taskId}” is already Done`,
              `You have uploaded file “${file.getName()}” recently, however this task is already marked as Done. You cannot upload a new version now.`
            );
            break;

          default:
            {
              DriveUtils.removeAllFiles(this.editedFolder, file.getName());

              // Making a copy and saving the file for further processing
              console.log('Copying “%s” into Edited folder.', file.getName());
              const copiedFile = file.makeCopy(this.editedFolder);

              // Saving file link
              task.setFieldValue(COLUMNS.EditedFileLink, copiedFile.getUrl());
              task.commitFieldValue(COLUMNS.EditedFileLink);

              task.setFieldValue(COLUMNS.Status, STATUSES.WIP);
              task.commitFieldValue(COLUMNS.Status);
            }
            break;
        }
      }

      if (!task) {
        console.warn('Task “%s” is not found in TE Doc.', taskId);
        super.sendEmailToDevotee(
          `Task “${taskId}” is not found in your TE Doc`,
          `You have uploaded “${file.getName()}” file recently, but there is no corresponding task in your TE Doc. Please recheck the file name and upload again.`
        );
      }

      this.processedFolder.addFile(file);
      this.uploadsFolder.removeFile(file);
    }
  }
}
