const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.addUserToDatabase = functions.auth.user().onCreate((user) => {
  const uid = user.uid;
  const email = user.email;
  const displayName = user.displayName;

  return admin.database().ref(`/users/${uid}`).set({
    email: email,
    displayName: displayName,
    // Dodajte dodatne korisničke podatke ako ih imate
  });
});
