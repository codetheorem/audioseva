import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import GoogleSheets from '../services/GoogleSheets';

export const processDonations = functions.database
  .ref('/donations/cash/{donation_id}')
  .onCreate(
    async (
      snapshot: functions.database.DataSnapshot,
      context: functions.EventContext
    ): Promise<any> => {
      const donation = snapshot.val();

      const gsheets = new GoogleSheets(
        functions.config().donations.cash.spreadsheet.id
      );
      const sheet = await gsheets.useSheet(
        functions.config().donations.cash.spreadsheet.name
      );

      await sheet.appendRow({
        Date: donation.date,
        Amount: donation.sum.amount,
        Currency: donation.sum.currency,
        'Donor Name': donation.donor.name,
        'Donor Phone Number': `'${donation.donor.phoneNumber}`,
        'Donor Email Address': donation.donor.emailAddress,
        'Collected By': donation.collectedBy,
        Comment: donation.comment,
      });

      return admin
        .database()
        .ref(`/email/notifications`)
        .push({
          to: donation.donor.emailAddress,
          replyTo: functions.config().donations.contact.email_address,
          bcc: [{ email: functions.config().donations.contact.email_address }],
          template: 'donations-acknowledgement',
          params: {
            donation,
          },
        });
    }
  );
