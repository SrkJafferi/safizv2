# Demo Users Setup Guide

## Test User Credentials

Ye demo users hain testing ke liye. Inhe use karke aap application ko sab roles ke saath test kar sakte ho:

### 1. Admin User
- **Email:** `admin@test.com`
- **Password:** `admin@123`
- **Role:** admin
- **Access:** Tamam features access hoga, user management, settings modify kar sakta hai

### 2. Manager User
- **Email:** `manager@test.com`
- **Password:** `manager@123`
- **Role:** manager
- **Access:** Production management aur reporting features

### 3. Machine Operator
- **Email:** `machineman@test.com`
- **Password:** `machine@123`
- **Role:** machineman
- **Access:** Machine operations aur production entries

### 4. Printer Operator
- **Email:** `printer@test.com`
- **Password:** `printer@123`
- **Role:** printer_operator
- **Access:** Printing operations aur job management

### 5. Laminator
- **Email:** `laminator@test.com`
- **Password:** `laminator@123`
- **Role:** laminator
- **Access:** Lamination tasks aur finishing operations

---

## How to Create Demo Users

### Option 1: Using Edge Function (Automated)

1. Open `CREATE_DEMO_USERS.html` in your browser
2. Click "Create Demo Users" button
3. Saare test users automatically create ho jayenge
4. Copy the credentials se sign in karo

### Option 2: Manual Creation in Supabase Dashboard

1. Go to Supabase Dashboard
2. Navigate to **Authentication > Users**
3. Click "Create new user"
4. For each user above:
   - Enter email
   - Enter password
   - Enable "Email Confirmed"
   - Click "Create User"
5. Go to **SQL Editor** aur ye query run karo:

```sql
-- Update roles for each user (run separately)
UPDATE profiles SET role = 'admin' WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@test.com');
UPDATE profiles SET role = 'manager' WHERE id = (SELECT id FROM auth.users WHERE email = 'manager@test.com');
UPDATE profiles SET role = 'machineman' WHERE id = (SELECT id FROM auth.users WHERE email = 'machineman@test.com');
UPDATE profiles SET role = 'printer_operator' WHERE id = (SELECT id FROM auth.users WHERE email = 'printer@test.com');
UPDATE profiles SET role = 'laminator' WHERE id = (SELECT id FROM auth.users WHERE email = 'laminator@test.com');
```

---

## Testing Workflow

### Step 1: Start Application
```bash
npm run dev
```

### Step 2: Login with Different Users
1. Application open hoga login page par
2. Ek user ke credentials enter karo
3. Dashboard load hoga with user ki role display hoga
4. Top navbar mein user name aur role badge dikhega

### Step 3: Test Different Roles
- Har role ke saath login karo
- Dashboard layout same hoga but future features mein role-based features hogan
- Logout button se sign out karo aur doosre user se login karo

### Step 4: Verify Role Display
- User profile badge top-right corner mein hona chahiye
- Role ke hisab se color coding hona chahiye:
  - Admin: Red badge
  - Manager: Blue badge
  - MachineMan: Orange badge
  - PrinterOperator: Green badge
  - Laminator: Purple badge

---

## Database Schema

### profiles table
```
id (uuid) - User ID from auth.users
role (enum) - User's role
full_name (text) - User's display name
created_at (timestamp)
updated_at (timestamp)
```

### settings table
```
id (uuid) - Primary key
approval_required (boolean) - System-wide setting
created_at (timestamp)
updated_at (timestamp)
```

---

## Troubleshooting

### Users not showing in Supabase
- Check if `on_auth_user_created` trigger is enabled
- Verify profiles table has RLS policies enabled

### Login failing
- Confirm email is correct (check Supabase auth users list)
- Password should be exactly as provided
- Check browser console for error messages

### Role not displaying
- Refresh the page
- Check profiles table to ensure role is set
- Clear browser localStorage: `localStorage.clear()` in console

---

## Next Steps

Ye Phase 1 complete ho gaya. Future phases mein:
- Inventory management
- Job tracking
- Production entries
- Audit trails
- Email notifications
- Advanced reporting

Ab aap phase 1 ke foundation par kaam kar sakte ho!
