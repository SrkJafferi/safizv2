# Quick Setup Guide - Demo Users Banao

## Step 1: Supabase Dashboard Kholo

1. Browser mein jao: https://supabase.com/dashboard
2. Login karo
3. Apna project select karo

## Step 2: Demo Users Create Karo

1. Left sidebar se **Authentication** > **Users** par click karo
2. **Add User** button (top right corner) par click karo
3. Har user ke liye ye karo:

### User 1: Admin
- **Email:** `admin@test.com`
- **Password:** `admin@123`
- **Auto Confirm User** checkbox ko **tick** karo
- Click **Create User**

### User 2: Manager
- **Email:** `manager@test.com`
- **Password:** `manager@123`
- **Auto Confirm User** checkbox ko **tick** karo
- Click **Create User**

### User 3: Machine Operator
- **Email:** `machineman@test.com`
- **Password:** `machine@123`
- **Auto Confirm User** checkbox ko **tick** karo
- Click **Create User**

### User 4: Printer Operator
- **Email:** `printer@test.com`
- **Password:** `printer@123`
- **Auto Confirm User** checkbox ko **tick** karo
- Click **Create User**

### User 5: Laminator
- **Email:** `laminator@test.com`
- **Password:** `laminator@123`
- **Auto Confirm User** checkbox ko **tick** karo
- Click **Create User**

## Step 3: Roles Assign Karo

1. Left sidebar se **SQL Editor** par click karo
2. New query kholo
3. Ye complete SQL query copy karke paste karo:

```sql
UPDATE profiles SET role = 'admin', full_name = 'Admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@test.com');

UPDATE profiles SET role = 'manager', full_name = 'Manager'
WHERE id = (SELECT id FROM auth.users WHERE email = 'manager@test.com');

UPDATE profiles SET role = 'machineman', full_name = 'Machine Man'
WHERE id = (SELECT id FROM auth.users WHERE email = 'machineman@test.com');

UPDATE profiles SET role = 'printer_operator', full_name = 'Printer Operator'
WHERE id = (SELECT id FROM auth.users WHERE email = 'printer@test.com');

UPDATE profiles SET role = 'laminator', full_name = 'Laminator'
WHERE id = (SELECT id FROM auth.users WHERE email = 'laminator@test.com');
```

4. **RUN** button par click karo
5. Success message dikhega

## Step 4: Login Test Karo

1. Apni application kholo
2. In credentials se login try karo:
   - Email: `admin@test.com`
   - Password: `admin@123`

3. Successfully login ho jayega aur dashboard dikhega!

## Test Credentials Summary

| Email | Password | Role |
|-------|----------|------|
| admin@test.com | admin@123 | Admin |
| manager@test.com | manager@123 | Manager |
| machineman@test.com | machine@123 | Machine Man |
| printer@test.com | printer@123 | Printer Operator |
| laminator@test.com | laminator@123 | Laminator |

---

## Agar Error Aaye

### "Profile Error" dikhta hai?
- SQL Editor mein dobara query run karo (Step 3)
- Confirm karo ke saare 5 users dashboard mein create hue hain

### Login nahi ho raha?
- Email aur password carefully check karo (copy-paste use karo)
- Browser cache clear karo (Ctrl+Shift+Delete)
- Incognito window mein try karo

### "Invalid login credentials" error?
- Supabase Dashboard > Authentication > Users mein confirm karo user exist karta hai
- Password exactly same hai verify karo
