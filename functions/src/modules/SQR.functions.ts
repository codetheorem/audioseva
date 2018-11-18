import * as functions from 'firebase-functions';
import * as  admin from 'firebase-admin';

const bucket = admin.storage().bucket();
const db = admin.database();
import * as helpers from './../helpers';

let emailTemplates = {};

/////////////////////////////////////////////////
//          OnNewAllotment (DB create and update Trigger)
//      1. Mark the files in the database --> { status: "Given" }
//              Function --> updateFilesOnNewAllotment
//
//      2. Send an email to the assignee to notify them of the new allotments
//              Function --> sendEmailOnNewAllotment
/////////////////////////////////////////////////
export const updateFilesOnNewAllotment = functions.database.ref('/sqr/allotments/{allotment_id}')
.onCreate((snapshot, context) => {
    const allotment = snapshot.val();
    let newDocKey = snapshot.key;

    // loop through the FILES array in the NEW ALLOTMENT object
    // and update their corresponding file objects
    allotment.files.forEach(async file => {
        let sqrRef = db.ref(`/files/${allotment.list}/${file}/soundQualityReporting`);
        
        let sqrError = await sqrRef.update({
            status: 'Given',
            assignee: allotment.assignee,
            timestampGiven: Math.round((new Date()).getTime() / 1000),
            timestampDone: null,
        });

        if (sqrError == undefined) { // if Successful FILE Update, update the ALLOTMENT accordingly

            // case 1 -- the allotmnet is read from the spreadsheet
            if (Object.keys(allotment).indexOf('sendNotificationEmail') > -1)
                db.ref(`/sqr/allotments/${newDocKey}`).update({ 
                    filesAlloted: true,
                });

            // case 2 -- the allotmnet is inputted manually
            else
                db.ref(`/sqr/allotments/${newDocKey}`).update({ 
                    filesAlloted: true,
                    sendNotificationEmail: true
                });
        }
    });

    return 1;
});

export const sendEmailOnNewAllotment = functions.database.ref('/sqr/allotments/{allotment_id}')
.onUpdate(async (change, context) => {
    const old = change.before.val();
    const newAllotment = change.after.val();        
    let coordinatorConfig = functions.config().coordinator;
    let templateId = functions.config().sqr.allotment.templateid;
    

    // Sends a notification to the devotee 
    // of the files he's allotted.
    let allotmentSnapshot = await db.ref('/sqr/allotments').orderByChild('devotee/emailAddress')
    .equalTo(newAllotment.devotee.emailAddress).once('value');

    const allotments = allotmentSnapshot.val();
    ////////////////
    // sending mail
    ///////////////
    if (!old.filesAlloted && newAllotment.filesAlloted && newAllotment.devotee)
        if (newAllotment.devotee.emailAddress) {
            let date = new Date();
            let utcMsec = date.getTime() + (date.getTimezoneOffset() * 60000);
            let localDate = new Date( utcMsec + ( 3600000 * coordinatorConfig.timeZoneOffset ) );
            helpers.sendEmail(
                newAllotment.devotee.emailAddress, //to
                [{ email: coordinatorConfig.email_address }], //bcc
                templateId,
                { //parameters
                    files: newAllotment.files,
                    devotee: newAllotment.devotee,
                    comment: newAllotment.comment,
                    date: `${localDate.getDate() + 1}.${date.getMonth() + 1}`,
                    repeated: Object.keys(allotments).length > 1
                }                    
            );
            change.after.ref.child('mailSent').set(true).catch(err => console.log(err));
        }
    
    return 1;
});



/////////////////////////////////////////////////
//          SQR Submission Processing (DB create Trigger)
//
//      1. Add the webform data to a SQR submissions DB path
//      2. Update the allotment to reflect the current state of the audio file
//      3. Notifying the coordinator using a mail that holds the following information
//          3.1 the current submission information
//          3.2 the data of the file in the submission
//          3.3 the list of all the files alloted to the devotee of the current submission
//          3.4 a boolean value indicating whether this is the first submission of this devotee or not
//              Function --> processSubmissions
/////////////////////////////////////////////////


export const processSubmissions = functions.database.ref('/webforms/sqr/{submission_id}')
.onCreate(async (snapshot, context) => {
    const original = snapshot.val();

    let audioFileStatus = 'WIP';    

    if (original.not_preferred_language) 
        audioFileStatus = 'Spare';        
    else if (original.unable_to_play_or_download)
        audioFileStatus = 'Audio Problem';    

    // 1. Add the webform data to a SQR submissions DB path
    let submission = {
        fileName: original.audio_file_name,
        cancellation: {
            notPreferredLanguage: audioFileStatus === 'Spare',
            audioProblem: audioFileStatus === 'Audio Problem'
        },
        soundQualityRating: original.sound_quality_rating,
        unwantedParts: original.unwanted_parts,
        soundIssues: original.sound_issues,
        duration: {
            beginning: original.beginning,
            ending: original.ending,
        },
        comments: original.comments,
        token: original.token,
        created: original.created, 
        //  timestamp of the submission creation,
        // can differ from COMPLETED in case of saving a DRAFT and completing later.
        completed: original.completed, // timestamp of the submission completion.
        changed: original.changed, //timestamp of the submission update.
        devotee: {
            name: original.name,
            emailAddress: original.email_address
        }
    };
    db.ref(`/sqr/submissions/${original.serial}`).update(submission);

    // 2. Update the allotment ( first get the previous NOTES )
    const filesSnapshot = await db.ref(`/sqr/files/${original.list}/${original.audio_file_name}`).once('value');
    let allotmentUpdates = { status: audioFileStatus };
    // in case 1 & 2 add the comments to the notes
    if (audioFileStatus !== 'WIP')
        allotmentUpdates['notes'] = `${filesSnapshot.val().notes}\n${original.comments}`;
    // if the audio has a problem then REMOVE the devotee from the file allotment
    if (audioFileStatus === 'audioProblem')
        allotmentUpdates['devotee'] = {};
    db.ref(`/sqr/files/${original.list}/${original.audio_file_name}`).update(allotmentUpdates);



    // Coordinator object example { templateid: 3, email:'a@a.a', name: 'Aj' }
    let coordinator = functions.config().sqr.coordinator;
    let templateId = functions.config().sqr.allotment.templateid;
    // 3. Notify the coordinator
    // 3.1 Get the submitted audio file data

    //  EXTRACTING the list name first from the file_name
    let list = helpers.extractListFromFilename(original.audio_file_name);
    
    let fileSnapshot = await db.ref(`/sqr/files/${list}/${original.audio_file_name}`).once('value')

    if (fileSnapshot.exists()) {
        let fileData = fileSnapshot.val();

        /////////////////////////////////////////////////////////////
        //
        // 3.2 Get the devotee's Allotments in ('given' || 'WIP') state
        // TO BE ADDED LATER
        // Currently passing an empty array
        //
        /////////////////////////////////////////////////////////////

        // 3.3 checking if the First Submission or not
        let submissionSnapshot = await db.ref(`/sqr/submissions`).orderByChild('devotee/emailAddress')
        .equalTo(original.email_address).once('value');

        if (submissionSnapshot.exists()) {
            let submissions = submissionSnapshot.val();

            // Sending the notification Email Finally
            helpers.sendEmail(
                coordinator.email_address,
                [{ email: coordinator.email }],
                templateId,
                {
                    submission,
                    fileData,
                    devoteeAllotmentsSet: [],
                    isFirstSubmission: Object.keys(submissions).length <= 1                                        
                }
            );
        }
    }
    
    return 1;
});


/////////////////////////////////////////////////
//          Update Email Templates on sendInBlue 
//          in response to changes of the templates
//          on FB (Storage Triggered)
//
/////////////////////////////////////////////////

export const updateEmailTemplates = functions.storage.object()
.onFinalize(async object => {

    const path = require('path');
    const os = require('os');
    const fs = require('fs');

    const filePath = object.name;
    // slice(0, -5) to get rid of the trailing '.html' extension
    const fileName = filePath.split('/')[2].slice(0, -5);
    const tempLocalFile = path.join(os.tmpdir(), fileName);
    
    
    if (!filePath.startsWith('email/templates')) 
        return 1;

    let emailRef = bucket.file(object.name);
    await emailRef.download({ destination: tempLocalFile });
    
    // Use the following to upate the template on SendInBlue
    let htmlContent = fs.readFileSync(tempLocalFile, 'utf-8');

    
    //////////////////////////////////////////
    // 1. Get the template ID (sendInBlue ID)
    //////////////////////////////////////////

    let templateNode = await db.ref('/email/templates').orderByKey()
    .equalTo(fileName).once('value');

    let template = templateNode.val();

    if (template.exists()) {
        await helpers.updateTemplate(template.id, htmlContent);
        /////////////////////////////////////////////////////////////////
        // 2. Send a test Email confirming it has been updated correctly
        /////////////////////////////////////////////////////////////////
        let { params, config } = template.sample;
        let { id } = template;
        await helpers.sendEmail(config.to, config.bcc, id, params);
    } 
    else {
        let subject = 'WHERE CAN I GET subject FROM'; // mandatory
        let id = await helpers.createTemplate(fileName, htmlContent, subject);
        await db.ref(`/email/templates/${fileName}`).push({
            id,
            lastUpdated: new Date(),
            version: 1
            // Need some way to fill `sample`
        });
        /////////////////////////////////////////////////////////////////
        // 2. Send a test Email confirming it has been updated correctly
        /////////////////////////////////////////////////////////////////
        // WAITING TO KNOW SOURCE OF params`, `config`        
    }    
    return 1;
});



export const sendNotificationEmail = functions.database.ref('/email/notifications}')
.onCreate(async (snapshot, context) => {
    const data = snapshot.val();
    const templateName = snapshot.key;

    let id;
    if (Object.keys(emailTemplates).indexOf(templateName) > -1)
        id = emailTemplates[templateName].id;
    else 
        id = await helpers.getTemplateId(templateName)

    await helpers.sendEmail(data.to, data.bcc, id, data.params);

    return snapshot.ref.update({ sent: true });
});