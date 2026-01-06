# دليل إنشاء الحسابات الأولية (Seed Data)

## طريقة 1: استخدام Seed Script (الأسهل) ✅

### الخطوات:

1. **تأكد من إعداد قاعدة البيانات:**
   ```bash
   cd server
   # تأكد من وجود ملف .env مع DATABASE_URL
   ```

2. **شغّل الـ Seed:**
   ```bash
   cd server
   npm run seed
   ```

   أو مباشرة:
   ```bash
   node prisma/seed.js
   ```

3. **الحسابات التي سيتم إنشاؤها:**

   | الدور | البريد الإلكتروني | كلمة المرور |
   |------|------------------|------------|
   | Super Admin | admin@ticketing.com | admin123 |
   | IT Manager | manager@ticketing.com | manager123 |
   | IT Admin | itadmin@ticketing.com | admin123 |
   | Technician 1 | technician1@ticketing.com | tech123 |
   | Technician 2 | technician2@ticketing.com | tech123 |

4. **التخصصات التي سيتم إنشاؤها:**
   - Help Desk (مكتب المساعدة)
   - Network (الشبكة)
   - Server/Admin (السيرفر/الإدارة)

### بعد تشغيل الـ Seed:

1. **سجّل دخول كـ Super Admin:**
   - Email: `admin@ticketing.com`
   - Password: `admin123`

2. **من لوحة Super Admin يمكنك:**
   - ✅ إضافة مستخدمين جدد (جميع الأدوار)
   - ✅ إضافة/تعديل التخصصات
   - ✅ رؤية جميع التذاكر
   - ✅ إعادة تعيين التذاكر
   - ✅ تغيير حالة الفنيين

3. **⚠️ مهم جداً:** غيّر كلمة مرور Super Admin بعد أول تسجيل دخول!

---

## طريقة 2: إنشاء يدوي من الواجهة

### الخطوات:

1. **سجّل حساب جديد كمستخدم عادي:**
   - اذهب إلى `/signup`
   - أنشئ حساب جديد

2. **غيّر الدور إلى Super Admin:**
   
   **الطريقة الأولى - Prisma Studio:**
   ```bash
   cd server
   npx prisma studio
   ```
   - افتح جدول `User`
   - ابحث عن المستخدم الذي أنشأته
   - غيّر `role` من `USER` إلى `SUPER_ADMIN`
   - احفظ

   **الطريقة الثانية - SQL مباشرة:**
   ```sql
   UPDATE "User" 
   SET role = 'SUPER_ADMIN' 
   WHERE email = 'your-email@example.com';
   ```

3. **سجّل دخول مرة أخرى:**
   - الآن ستكون Super Admin ويمكنك إضافة المستخدمين والتخصصات

---

## طريقة 3: استخدام API مباشرة

### إنشاء Super Admin عبر API:

```bash
# 1. سجّل حساب عادي أولاً
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Super Admin",
    "email": "admin@ticketing.com",
    "password": "admin123"
  }'

# 2. غيّر الدور في قاعدة البيانات (استخدم Prisma Studio أو SQL)
```

---

## إعادة تشغيل الـ Seed

إذا أردت إعادة تشغيل الـ Seed (سيتم تحديث البيانات الموجودة):

```bash
cd server
npm run seed
```

**ملاحظة:** الـ Seed يستخدم `upsert` لذلك لن يخلق حسابات مكررة، بل سيحدث الحسابات الموجودة.

---

## إنشاء مستخدمين جدد من Super Admin

بعد تسجيل الدخول كـ Super Admin:

1. **إضافة مستخدم جديد:**
   - اذهب إلى صفحة "المستخدمون"
   - انقر على "إضافة مستخدم" (إذا كانت موجودة)
   - أو استخدم API مباشرة

2. **إضافة تخصص جديد:**
   - اذهب إلى صفحة "التخصصات"
   - انقر على "إضافة تخصص"
   - أدخل الاسم والوصف

---

## استكشاف الأخطاء

### خطأ: "Cannot find module '@prisma/client'"
```bash
cd server
npx prisma generate
npm install
```

### خطأ: "Database connection failed"
- تأكد من أن `DATABASE_URL` في ملف `.env` صحيح
- تأكد من أن قاعدة البيانات على Neon نشطة

### خطأ: "Table does not exist"
```bash
cd server
npx prisma migrate dev
```

---

## نصائح أمنية

1. **غيّر كلمات المرور الافتراضية فوراً**
2. **لا تستخدم كلمات مرور بسيطة في الإنتاج**
3. **استخدم متغيرات بيئية آمنة**
4. **فعّل HTTPS في الإنتاج**

---

## الحسابات الافتراضية بعد Seed

```
Super Admin:
  Email: admin@ticketing.com
  Password: admin123
  ⚠️ غيّر كلمة المرور فوراً!

IT Manager:
  Email: manager@ticketing.com
  Password: manager123

IT Admin:
  Email: itadmin@ticketing.com
  Password: admin123

Technician 1 (Help Desk):
  Email: technician1@ticketing.com
  Password: tech123

Technician 2 (Network):
  Email: technician2@ticketing.com
  Password: tech123
```

