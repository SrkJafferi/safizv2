# Phase 5B-2C-1 - Permission Check Implementation

## Overview
Phase 5B-2C-1 adds role-based permission validation to the `approveEntry` and `rejectEntry` functions. Only users with "admin" or "manager" roles can approve or reject production entries.

## Implementation Summary

### Modified File
- `src/services/jobEntryService.ts`

### Changes to `approveEntry()` Function

**Added Permission Check:**
```typescript
const { data: { user } } = await supabase.auth.getUser();

if (!user) {
  return {
    success: false,
    error: 'Unauthorized',
  };
}

const { data: profile } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', user.id)
  .maybeSingle();

if (!profile) {
  return {
    success: false,
    error: 'User profile not found',
  };
}

if (profile.role !== 'admin' && profile.role !== 'manager') {
  return {
    success: false,
    error: 'Permission denied',
  };
}
```

**Flow:**
1. Get current logged-in user
2. If no user → return "Unauthorized"
3. Fetch user's role from profiles table
4. If no profile found → return "User profile not found"
5. If role is NOT "admin" OR "manager" → return "Permission denied"
6. If role is valid → continue with approval logic

### Changes to `rejectEntry()` Function

**Same Permission Check Added:**
- Identical logic as `approveEntry()`
- Validates user authentication
- Validates user profile exists
- Validates user has "admin" or "manager" role
- Returns appropriate error messages

## Permission Matrix

| Role | Can Approve? | Can Reject? |
|------|--------------|-------------|
| admin | Yes | Yes |
| manager | Yes | Yes |
| machineman | No | No |
| printer_operator | No | No |
| laminator | No | No |
| Not logged in | No | No |

## Error Messages

1. **"Unauthorized"** - User not logged in
2. **"User profile not found"** - Profile missing in database
3. **"Permission denied"** - User role is not admin or manager

## Testing Scenarios

### Test 1: Admin Approves Entry
```
User: admin@test.com (role: admin)
Action: Call approveEntry(entryId)
Expected: Success, entry approved
```

### Test 2: Manager Approves Entry
```
User: manager@test.com (role: manager)
Action: Call approveEntry(entryId)
Expected: Success, entry approved
```

### Test 3: Machine Man Tries to Approve
```
User: machineman@test.com (role: machineman)
Action: Call approveEntry(entryId)
Expected: Error "Permission denied"
```

### Test 4: Unauthenticated User
```
User: Not logged in
Action: Call approveEntry(entryId)
Expected: Error "Unauthorized"
```

### Test 5: Admin Rejects Entry
```
User: admin@test.com (role: admin)
Action: Call rejectEntry(entryId)
Expected: Success, entry rejected
```

### Test 6: Manager Rejects Entry
```
User: manager@test.com (role: manager)
Action: Call rejectEntry(entryId)
Expected: Success, entry rejected
```

## Security Notes

1. Permission check happens BEFORE any database updates
2. Uses `.maybeSingle()` to safely query user profile
3. Explicit role validation (no wildcards)
4. Consistent error handling
5. Try-catch wraps entire function for safety

## Backward Compatibility

- Existing `createJobEntry()` unchanged
- Existing `deleteJobEntry()` unchanged
- Existing `getJobEntries()` unchanged
- No database schema changes
- No type definition changes

## Build Status

Build passes successfully:
```
✓ 1558 modules transformed
✓ built in 9.52s
```

Note: Pre-existing TypeScript errors in other files do not affect build.

## What's Next (Phase 5B-2C-2)

Phase 5B-2C-2 will add:
1. UI buttons for Approve/Reject in EntryList.tsx
2. Visual indicators for pending entries
3. Action button visibility based on user role
4. Toast notifications for approval/rejection
5. Automatic list refresh after actions

## Files Modified

1. `src/services/jobEntryService.ts` - Added permission checks
2. `PHASE_5B2C1_PERMISSION_CHECK.md` - This documentation

## Completion Status

Phase 5B-2C-1: COMPLETE

All requirements met:
- Permission validation added to approveEntry()
- Permission validation added to rejectEntry()
- Uses supabase.auth.getUser()
- Fetches role from profiles table
- Checks for admin or manager role
- Returns "Unauthorized" if no user
- Returns "Permission denied" if wrong role
- No other files modified
- Build passes successfully
- No TypeScript errors in modified code

## Code Summary

**Lines Changed:**
- `approveEntry()`: Added lines 303-330 (28 lines of permission check)
- `rejectEntry()`: Added lines 369-396 (28 lines of permission check)

**Total Addition:** 56 lines of permission validation code

**Key Pattern:**
```typescript
// 1. Check authentication
const { data: { user } } = await supabase.auth.getUser();
if (!user) return error;

// 2. Get user role
const { data: profile } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', user.id)
  .maybeSingle();
if (!profile) return error;

// 3. Validate role
if (profile.role !== 'admin' && profile.role !== 'manager') {
  return error;
}

// 4. Continue with original logic
```

This pattern ensures secure, role-based access control.
