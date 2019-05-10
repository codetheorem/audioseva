import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import * as moment from 'moment';
import * as helpers from './../helpers';
import { objectWithDefaults } from "../utils/objectUtils";
import { onCreateFileCountByStatus, onUpdateFileCountByStatus, runHandlers, statuses } from "../utils/sharedHandlers";

/**
 * Saves allotment to the db and sends an email notification
 */
export const processAllotment = functions.https.onCall(
  async ({ assignee, tasks, comment }, context): Promise<void> => {
    if (
      !context.auth ||
      !context.auth.token ||
      !context.auth.token.coordinator
    ) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'The function must be called by an authenticated coordinator.'
      );
    }

    if (!assignee || !tasks || tasks.length === 0)
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Devotee and Tasks are required.'
      );

    //  Check if Assignee is found
    if (!(await admin
      .database()
      .ref('/users')
      .orderByChild('emailAddress')
      .equalTo(assignee.emailAddress)
      .once('value')).exists()) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        "Assignee wasn't found!"
      );
    }

    const tasksForEmail = await Promise.all(
      tasks.map(async (taskId: string) => {
        const list = helpers.extractListFromFilename(taskId);

        const taskRef = admin.database().ref(`/edited/${list}/${taskId}/trackEditing`);

        await taskRef.update({
          status: 'Given',
          assignee: assignee,
          givenTimestamp: moment().format(),
        });

        // Getting the tasks list to be used when notifying the assignee
        const task = (await taskRef.once('value')).val();

        //inject filename and sourceFileLink into the task object returned by db call
        task.fileName = taskId;
        task.chunks.forEach(chunk => {
          chunk.sourceFileLink = `https://edited.${
            functions.config().storage['root-domain']
            }/${helpers.extractListFromFilename(chunk.fileName)}/${chunk.fileName}`;
        });
        return task;
      })
    );

    const coordinator = functions.config().coordinator;

    // Notify the assignee
    await admin.database().ref(`/email/notifications`).push({
      template: 'track-editing-allotment',
      to: assignee.emailAddress,
      bcc: coordinator.email_address,
      params: {
        tasks: tasksForEmail,
        assignee: assignee,
        comment: comment,
        date: moment()
          .utcOffset(coordinator.utc_offset)
          .format('DD.MM'),
        uploadURL: `${functions.config().website.base_url}/te/upload/`,
      },
    });
  }
);

const makeSortField = (key: string, ...args: string[]) => {
  return `${args.join("")}-${key}`
};

export const createAssigneeStatusIndex = functions.database.ref(
    "/edited/{fileName}/trackEditing"
).onCreate((snapshot, { params: { fileName } }) => {
  const updateData = {};
  const { assignee, status } = snapshot.val();
  if (assignee) updateData["_sort_assignee"] = makeSortField(fileName, assignee.emailAddress);
  if (status) updateData["_sort_status"] = makeSortField(fileName, status);
  if (assignee && status) updateData["_sort_assignee_status"] = makeSortField(fileName, assignee.emailAddress, status);
  return Object.keys(updateData).length ? snapshot.ref.update(updateData) : 1;
});

export const updateAssigneeStatusIndex = functions.database.ref(
    "/edited/{fileName}/trackEditing"
).onUpdate(({ before, after }, { params: { fileName } }) => {
  const oldAssignee = before.child("assignee/emailAddress").val();
  const assignee = after.child("assignee/emailAddress").val();
  const oldStatus = before.child("status").val();
  const status = after.child("status").val();
  const update = {};
  if (oldStatus !== status) {
    if (status) {
      update["_sort_status"] = makeSortField(fileName, status);
    } else {
      update["_sort_status"] = null;
    }
  }

  if (oldAssignee !== assignee) {
    if (assignee) {
      update["_sort_assignee"] = makeSortField(fileName, assignee);
    } else {
      update["_sort_assignee"] = null;
    }
  }

  if (assignee && status) {
    update["_sort_assignee_status"] = makeSortField(fileName, assignee, status);
  } else {
    update["_sort_assignee_status"] = null;
  }

  return Object.keys(update).length ? after.ref.update(update) : 1;
});

const getStatistics = async (): Promise<{ now: moment.Moment, date: string, statistics: any }> => {
  const now = moment();
  const date = now.format("MM-DD-YYYY");
  const statistics = (await admin.database().ref(`/statistics/trackEditing/${date}`).once("value")).val();
  return {
    now,
    date,
    statistics
  }
};

const onCreateStatusStatistics = async (snapshot) => {
  const status = snapshot.val();
  const { now, date, statistics } = await getStatistics();
  let updatedStatistics = statistics;

  if (updatedStatistics) {
    updatedStatistics[status] += 1;
  } else {
    updatedStatistics = objectWithDefaults({ [status]: 1, "_sort_timestamp": now.valueOf() }, statuses);
  }
  return admin.database().ref(`/statistics/trackEditing/${date}`).update(updatedStatistics);
};

const onUpdateStatusStatistics = async ({ before, after }) => {
  const status = after.val();
  if (!status) return 1;
  const { date, statistics } = await getStatistics();

  return admin.database().ref(
      `/statistics/trackEditing/${date}/${status}`
  ).set(statistics[status] + 1);
};

export const onCreateStatus = functions.database.ref(
    "/edited/{fileName}/trackEditing/status"
).onCreate(runHandlers(
    onCreateStatusStatistics,
    onCreateFileCountByStatus("trackEditing")
));

export const onUpdateStatus = functions.database.ref(
    "/edited/{fileName}/trackEditing/status"
).onUpdate(runHandlers(
    onUpdateStatusStatistics,
    onUpdateFileCountByStatus("trackEditing")
));
