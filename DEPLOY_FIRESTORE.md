# Deploy Firestore rules (lounge production)

Lounge writes fail in production until these rules are **published** to your Firebase project.

Repo file: [`firestore.rules`](./firestore.rules)

The rules already include:

```
match /loungeRooms/{roomId}/messages/{messageId} {
  allow read: if isSignedIn();
  allow create: if isSignedIn() && isValidLoungeMessage(...);
  allow update, delete: if false;
}
```

Plus hardened `/users/{userId}` chats, gallery, companions.

---

## Option A — Firebase Console (fastest)

1. Open [Firebase Console](https://console.firebase.google.com/) → select the **VelvetMotion** project (same project as Vercel env vars).
2. Left nav: **Build** → **Firestore Database** → **Rules** tab.
3. Open `firestore.rules` from this repo (raw on GitHub or local clone).
4. Select all in the Console editor → paste full file → **Publish**.
5. Wait ~1 minute for propagation.

## Option B — Firebase CLI

```bash
npm i -g firebase-tools
firebase login
cd /path/to/velvetmotion-ai

# list projects, then select
firebase projects:list
firebase use <YOUR_PROJECT_ID>

# deploy rules only
firebase deploy --only firestore:rules
```

If you do not have `firebase.json` yet:

```bash
firebase init firestore
# choose existing project, point rules file at firestore.rules, skip indexes if unsure
firebase deploy --only firestore:rules
```

## Verify

1. Open the live site → sign in.
2. Open **Lounge**.
3. Post a short message.
4. If it appears and does not error in the browser console, rules are live.
5. Signed-out users should still be blocked from writing.

## Env checklist (Vercel)

Confirm these match the Firebase project you published rules to:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- (and related Firebase public config)

Wrong project ID = rules deploy to the wrong place and lounge still fails.

## Status

- [x] `firestore.rules` in repo includes `loungeRooms`
- [ ] Rules **Published** in Firebase Console / CLI (you must do this once)
- [ ] Lounge tested while signed in on production

Update [`PLAN.md`](./PLAN.md) checkbox when done.
