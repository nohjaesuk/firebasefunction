//
// const functions = require('firebase-functions');
// const admin = require('firebase-admin');
// admin.initializeApp();
//
// exports.sendNotification = functions.database.ref('/notifications/{user_id}/{notification_id}').onWrite((change, context) => {
//
//   const user_id = context.params.user_id;
//   const notification_id = context.params.notification_id;
//
//   console.log("We have a notification to send to : ", user_id);
//
//   // if(!context.data.val()){
//   //   return console.log("A notification has been deleted from the database : ", notification_id);
//   // }
//
//   const fromUser = admin.database().ref(`/notifications/${user_id}/${notification_id}`).once('value');
//
//   return fromUser.then(fromUserResult => {
//
//     const from_user_id = fromUserResult.val().from;
//
//     console.log("You have new notification from : ", from_user_id);
//
//     const userQuery = admin.database().ref(`/users/${from_user_id}/name`).once('value');
//     const deviceToken = admin.database().ref(`/users/${user_id}/device_token`).once('value');
//
//     return Promise.all([userQuery, deviceToken]).then(result =>{
//
//       const userName = result[0].val();
//       const token_id = result[1].val();
//
//       const payload = {
//         notification: {
//           title : "Friend Request",
//           body : `${userName} has sent you Friend Request`,
//           icon : "default",
//           click_action : "parkc.parkichat_TARGET_NOTIFICATION",
//           sound : "default"
//         },
//         data : {
//           from_user_id : from_user_id
//         }
//       };
//
//       return admin.messaging().sendToDevice(token_id, payload).then(response => {
//         console.log('This was the notification feature');
//         return 1
//       });
//
//     });
//   });
// });








'use strict'

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const apn = require('apn');
admin.initializeApp();

exports.sendIOSNotification = functions.database.ref('/messages/{message_id}').onCreate((snap, context) => {

  const message_id = context.params.message_id;
  const type = snap.val().type;
  const value = snap.val().value;
  const sender_ID = snap.val().sender_ID;
  const receiver_ID = snap.val().receiver_ID;
  const chat_type = snap.val().chat_type;
  // console.log(message_id)
  // console.log(type)
  // console.log(value)
  // console.log(sender_ID)
  // console.log(receiver_ID)
  // console.log(chat_type)

  const userQuery = admin.database().ref(`/users/${sender_ID}/name`).once('value');
  var senderName;
  const x = userQuery.then( result => {
    senderName = result.val();
    console.log("senderName: ",senderName);
    return senderName
  });
  console.log("x :", x);


  function getDeviceToken(receiver_ID){
    console.log("getDeviceToken starts");

    if(chat_type === "user") {
      console.log("chat_type is user");

      const tokenQuery = admin.database().ref(`/users/${receiver_ID}/device_token`).once('value');
      return Promise.all([tokenQuery])
    }
    else if (chat_type === "group") {
      console.log("chat_type is group")
      const groupUsersQuery = admin.database().ref(`/groups/${receiver_ID}/group_members`).once('value');
      return Promise.all([groupUsersQuery]).then( result => {
        const groupUsers = Object.keys(result[0].val());
        var tokenQuerys = [];
        var count = 0;
        for (const user in groupUsers) {
          console.log("user : ", user)
          console.log("groupUsers[user] : ", groupUsers[user])
          const groupUser = groupUsers[user];
          if (groupUser === sender_ID){
            continue;
          }
          // const tokenQuery = admin.database().ref(`/users/${user}/device_token`).once('value');
          const tokenQuery = admin.database().ref(`/users/${groupUser}/device_token`).once('value');
          tokenQuerys.push(tokenQuery);
        }
        return Promise.all(tokenQuerys)
        // .then( result => {
        //   var tokens = [];
        //   for (var i=0 ; i<tokenQuerys.length ; i++) {
        //     tokens.push(result[i].val())
        //   }
        //   console.log("getToken end")
        //   return tokens
        // })
      })
    }
  }

  function getVoiceToken(receiver_ID){
    console.log("getVoiceToken starts");

    if(chat_type === "user") {
      console.log("chat_type is user");

      const tokenQuery = admin.database().ref(`/users/${receiver_ID}/voice_token`).once('value');
      return Promise.all([tokenQuery])
    }
    else if (chat_type === "group") {
      console.log("chat_type is group")
      const groupUsersQuery = admin.database().ref(`/groups/${receiver_ID}/group_members`).once('value');
      return Promise.all([groupUsersQuery]).then( result => {
        const groupUsers = Object.keys(result[0].val());
        var tokenQuerys = [];
        var count = 0;
        for (const user in groupUsers) {
          console.log("user : ", user)
          console.log("groupUsers[user] : ", groupUsers[user])
          const groupUser = groupUsers[user];
          if (groupUser === sender_ID){
            continue;
          }
          // const tokenQuery = admin.database().ref(`/users/${user}/device_token`).once('value');
          const tokenQuery = admin.database().ref(`/users/${groupUser}/voice_token`).once('value');
          tokenQuerys.push(tokenQuery);
        }
        return Promise.all(tokenQuerys)
        // .then( result => {
        //   var tokens = [];
        //   for (var i=0 ; i<tokenQuerys.length ; i++) {
        //     tokens.push(result[i].val())
        //   }
        //   console.log("getToken end")
        //   return tokens
        // })
      })
    }
  }

  if (type === "text") {
    return getDeviceToken(receiver_ID).then( result => {

      console.log("get text message");

      var deviceToken = [];
      console.log("group users count : ", result.length)
      for (var i=0 ; i<result.length ; i++) {
        console.log("devicetoken: ",result[i].val())
        deviceToken.push(result[i].val())
      }

      console.log("token_id : ", deviceToken);
      const textPayload = {
        notification: {
          title : senderName,
          body : value,
          sound : "default"
        },

        data: {
          type: type,
          sender_ID: sender_ID,
          value: value,
          chat_type: chat_type,
          chat_ID: receiver_ID
        }

      };

      return admin.messaging().sendToDevice(deviceToken, textPayload).then(response => {
        console.log('This was the text notification feature');
        return 1
      });
    })
  } else {
    return getVoiceToken(receiver_ID).then( result => {

      console.log("get voice message");

      var androidVoiceTokens = [];
      var iosVoiceTokens = [];
      const userCount = result.length
      console.log("userCount : ", userCount)
      for (var i=0 ; i < userCount ; i++) {
        const token = result[i].val();
        console.log(token)
        if (token.length === 64){
          iosVoiceTokens.push(token)
        } else {
          androidVoiceTokens.push(token)
        }
      }
      console.log("android voice token : ", androidVoiceTokens);
      console.log("ios voice token : ", iosVoiceTokens);

      const voicePayload = {
        notification: {
          title : senderName,
          body : value
        },
        data: {
          type: type,
          sender_ID: sender_ID,
          value: value,
          chat_type: chat_type,
          chat_ID: receiver_ID
        }
      }

      // var voiptoken = 'c890f728f01a46c67cff71458cd3cd991c7e694193391e49a631c18026fdde37';
      var voipoptions = {
      	token: {
      		key: "./keys/AuthKey_TT9GQBVD5A.p8",
      		keyId: "TT9GQBVD5A",
      		teamId:"DLWJ388XWM"
      	},
      	production: false
      };

      console.log("when voicesending, senderName: ", senderName);
      var voipnote = new apn.Notification();
      voipnote.topic = "com.teambplus.bboong.voip";
      voipnote.badge = 2;
      voipnote.alert = 'voip 푸시 테스트';
      voipnote.payload = {'messageFrom': 'server', 'message': 'im voip', "value": value, "senderName": senderName};
      var apnProvider = new apn.Provider(voipoptions);

      if(androidVoiceTokens.length !== 0){
        admin.messaging().sendToDevice(androidVoiceTokens, voicePayload)
        // .then( response => {
          console.log('Android voice notification');
        //   console.log(response);
        //   return 1;
        // });
      }

      if(iosVoiceTokens.length !== 0){
        apnProvider.send(voipnote, iosVoiceTokens)
        // .then( (result) => {
          console.log('IOS voice notification');
          // console.log(result);
        // });
      }

      return 1

    })
  }
});



// return getToken(receiver_ID).then( result => {
//   var token = [];
//   for (var i=0 ; i<tokenQuerys.length ; i++) {
//     token.push(result[i].val())
//   }
//
//
//   if (type === "text") {
//     console.log("get text message");
//     return Promise.all([userQuery]).then(result =>{
//
//       const senderName = result[0].val();
//
//       console.log("senderName : ", senderName);
//       console.log("token_id : ", token);
//
//       const textPayload = {
//         notification: {
//           title : senderName,
//           body : value,
//           sound : "default"
//         }
//       };
//
//       return admin.messaging().sendToDevice(token, textPayload).then(response => {
//         console.log('This was the text notification feature');
//         return 1
//       });
//     });
//   } else {
//     console.log("get voice message");
//
//     const voicePayload = {
//       notification: {
//         title : senderName,
//         body : value,
//         sound : "default"
//       },
//       data: {
//         type: type,
//         sender_ID: sender_ID,
//         value: value,
//         chat_type: chat_type,
//         chat_ID: receiver_ID
//       }
//     }
//
//       var voiptoken = 'c890f728f01a46c67cff71458cd3cd991c7e694193391e49a631c18026fdde37';
//       var voipoptions = {
//         token: {
//           key: "./keys/AuthKey_TT9GQBVD5A.p8",
//           keyId: "TT9GQBVD5A",
//           teamId:"DLWJ388XWM"
//         },
//         production: false
//       };
//       var voipnote = new apn.Notification();
//       voipnote.topic = "com.teambplus.bboong.voip";
//       voipnote.badge = 2;
//       voipnote.alert = 'voip 푸시 테스트';
//       voipnote.payload = {'messageFrom': 'server', 'message': 'im voip', "voiceuuid": value};
//       var apnProvider = new apn.Provider(voipoptions);
//       return apnProvider.send(voipnote, voiptoken).then( (result) => {
//         console.log(result)
//         if (result.failed) {
//           console.log(result.failed)
//         }
//         return 0
//       });
//
//   }
