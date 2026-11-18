# Firestore Security Specification (`security_spec.md`)

## 1. Data Invariants & Relationship Mapping (Master Source of Truth)

- **Root Identity (`/users/{userId}`)**:
  - `userId` must match `^[a-zA-Z0-9_\-]+$` (1..128 chars) and equal `request.auth.uid`.
  - Only verified authenticated users (`request.auth.token.email_verified == true`) can create or update their own `/users/{userId}` document.
  - No PII (`email`, `phone`, `address`) is stored in `/users/{userId}`; only `uid`, `username`, `coins`, `createdAt`, `updatedAt`.
  - `createdAt` and `uid` are immutable on update; `updatedAt` must equal `request.time`.

- **Subcollections (`/users/{userId}/chats/{characterId}`, `/users/{userId}/gallery/{mediaId}`, `/users/{userId}/companions/{companionId}`)**:
  - **Master Gate**: Single-document operations (`get`, `create`, `update`, `delete`) require the parent `/users/{userId}` document to exist (`exists(/databases/$(database)/documents/users/$(userId))`) and belong to `request.auth.uid` (`get(/databases/$(database)/documents/users/$(userId)).data.uid == request.auth.uid`).
  - **Secure List Queries**: `allow list` verifies `isOwner(userId) && resource.data.userId == request.auth.uid` without `get()`/`exists()` inside `list`.
  - **Total Array Guarding**: `gifts` in `ChatSession` is bounded to `<= 20` items and checked for string element validity.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Unauthenticated Write**: Creating `/users/user_1` with `auth == null` -> `PERMISSION_DENIED`.
2. **Unverified Email Spoof**: Creating `/users/user_1` with `email_verified: false` -> `PERMISSION_DENIED`.
3. **Identity Spoofing**: User `user_1` creating `/users/user_1` with `uid: "user_2"` -> `PERMISSION_DENIED`.
4. **Shadow Field Injection**: Updating `/users/user_1` with extra field `isAdmin: true` -> `PERMISSION_DENIED`.
5. **Path Variable Poisoning**: Accessing `/users/bad$id!` with invalid characters -> `PERMISSION_DENIED`.
6. **Value Poisoning (Negative Coins)**: Updating `/users/user_1` with `coins: -500` or string `"1000"` -> `PERMISSION_DENIED`.
7. **Timestamp Forgery**: Creating `/users/user_1` with a past client `createdAt` != `request.time` -> `PERMISSION_DENIED`.
8. **Immutable Field Mutation**: Updating `/users/user_1` with a modified `createdAt` or `uid` -> `PERMISSION_DENIED`.
9. **Orphaned Subcollection Write**: Creating `/users/user_1/chats/liora` when `/users/user_1` does not exist -> `PERMISSION_DENIED`.
10. **Array Overflow / Type Poisoning**: Creating `/users/user_1/chats/liora` with 25 items in `gifts` or non-string first element -> `PERMISSION_DENIED`.
11. **Cross-Tenant Read (PII / Profile Leak)**: User `user_2` reading `/users/user_1` or `/users/user_1/gallery/media_1` -> `PERMISSION_DENIED`.
12. **Underage Custom Companion**: Creating `/users/user_1/companions/comp_1` with `age: 18` (below minimum 21) -> `PERMISSION_DENIED`.

## 3. Red Team Audit Conflict Report

- **Identity Spoofing**: Blocked by `data.uid == request.auth.uid && data.uid == userId` and `data.userId == request.auth.uid && data.userId == userId`.
- **State Shortcutting**: Blocked by strict action-based update gates with `affectedKeys().hasOnly(...)`.
- **Resource Poisoning**: Blocked by `isValidId()` on all path variables and explicit `.size()` bounds on every string and list.
- **Value Poisoning**: Blocked by wrapping every `allow update` with `isValid[Entity](incoming(), ...)`.
