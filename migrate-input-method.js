// Firestore migration script: Set inputMethod to 'manual' for all your tasks that are missing it.
// 1. Open dashboard.html in your browser (while logged in).
// 2. Open the browser console and paste this script, then run it.
// 3. It will update all your tasks to ensure inputMethod is set.

(async function migrateInputMethod() {
  if (!window.firebaseDb || !window.firebaseAuth) {
    alert('Firebase not initialized!');
    return;
  }
  const user = window.firebaseAuth.currentUser;
  if (!user) {
    alert('Not authenticated!');
    return;
  }
  const tasksRef = window.firebaseDb.collection('tasks').where('userId', '==', user.uid);
  const snapshot = await tasksRef.get();
  let updated = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (!data.inputMethod) {
      await doc.ref.update({ inputMethod: 'manual' });
      updated++;
    }
  }
  alert(`Migration complete! Updated ${updated} tasks.`);
})();
