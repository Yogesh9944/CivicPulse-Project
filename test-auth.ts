import assert from 'assert';
import fs from 'fs';
import path from 'path';

// Use the running development server port (3000) by default, or fallback to custom environment variables
const PORT = Number(process.env.TEST_PORT) || Number(process.env.PORT) || 3000;
const BASE_URL = `http://localhost:${PORT}`;

const testEmail = `test_auth_user_${Date.now()}_${Math.floor(Math.random() * 1000)}@example.com`;
const testName = 'Test Civic Citizen';
const testPassword = 'SecurePassword123!';

async function runTests() {
  console.log('🚀 Starting Backend Authentication Test Suite...');
  console.log(`Target Server URL: ${BASE_URL}`);
  console.log(`Test Email: ${testEmail}`);

  try {
    // Check if the server is up and running
    console.log('Checking server connectivity...');
    const healthCheck = await fetch(`${BASE_URL}/api/health`).catch(() => null);
    if (!healthCheck || !healthCheck.ok) {
      throw new Error(`Unable to connect to server at ${BASE_URL}. Ensure the development server is running.`);
    }
    console.log('✅ Connected to target server successfully!');

    // ----------------------------------------------------
    // TEST 1: Register Validations and Error Handling
    // ----------------------------------------------------
    console.log('\n--- 📝 Test Case 1: Registration Validation ---');

    // Case 1a: Missing fields
    console.log('Case 1a: Registering with missing fields...');
    const resRegisterMissing = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail }), // missing name and password
    });
    assert.strictEqual(resRegisterMissing.status, 400, 'Expected 400 Bad Request for missing fields');
    const jsonRegisterMissing = await resRegisterMissing.json() as any;
    assert.ok(jsonRegisterMissing.error.includes('required'), 'Expected error message to mention required fields');
    console.log('✅ Handled missing registration fields correctly.');

    // Case 1b: Success registration
    console.log('Case 1b: Registering a valid user...');
    const resRegisterSuccess = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: testName, email: testEmail, password: testPassword }),
    });
    assert.strictEqual(resRegisterSuccess.status, 201, 'Expected 201 Created on successful registration');
    const registerData = await resRegisterSuccess.json() as any;
    assert.ok(registerData.token, 'Response should contain a JWT token');
    assert.ok(registerData.user, 'Response should contain user info');
    assert.strictEqual(registerData.user.email, testEmail, 'User email should match');
    assert.strictEqual(registerData.user.name, testName, 'User name should match');
    assert.strictEqual(registerData.user.password, undefined, 'Password field should be omitted from output');
    const registeredToken = registerData.token;
    console.log('✅ User successfully registered and returned a valid JWT.');

    // Case 1c: Duplicate registration
    console.log('Case 1c: Registering with a duplicate email...');
    const resRegisterDuplicate = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: testName, email: testEmail, password: testPassword }),
    });
    assert.strictEqual(resRegisterDuplicate.status, 400, 'Expected 400 Bad Request for duplicate email');
    const jsonRegisterDuplicate = await resRegisterDuplicate.json() as any;
    assert.ok(jsonRegisterDuplicate.error.includes('already exists'), 'Expected already exists error message');
    console.log('✅ Handled duplicate email registration correctly.');


    // ----------------------------------------------------
    // TEST 2: Login Validation and Error Handling
    // ----------------------------------------------------
    console.log('\n--- 🔑 Test Case 2: Login Validation ---');

    // Case 2a: Missing email/password
    console.log('Case 2a: Logging in with missing fields...');
    const resLoginMissing = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail }), // missing password
    });
    assert.strictEqual(resLoginMissing.status, 400, 'Expected 400 Bad Request for missing login fields');
    const jsonLoginMissing = await resLoginMissing.json() as any;
    assert.ok(jsonLoginMissing.error.includes('required'), 'Expected error message to mention required fields');
    console.log('✅ Handled missing login fields correctly.');

    // Case 2b: Incorrect password
    console.log('Case 2b: Logging in with incorrect password...');
    const resLoginWrongPassword = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'WrongPassword' }),
    });
    assert.strictEqual(resLoginWrongPassword.status, 400, 'Expected 400 Bad Request for wrong password');
    const jsonLoginWrongPassword = await resLoginWrongPassword.json() as any;
    assert.ok(jsonLoginWrongPassword.error.includes('Invalid email or password'), 'Expected invalid login error');
    console.log('✅ Handled incorrect password authentication correctly.');

    // Case 2c: Non-existent email
    console.log('Case 2c: Logging in with non-existent email...');
    const resLoginWrongEmail = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent@example.com', password: testPassword }),
    });
    assert.strictEqual(resLoginWrongEmail.status, 400, 'Expected 400 Bad Request for wrong email');
    const jsonLoginWrongEmail = await resLoginWrongEmail.json() as any;
    assert.ok(jsonLoginWrongEmail.error.includes('Invalid email or password'), 'Expected invalid login error');
    console.log('✅ Handled non-existent email correctly.');

    // Case 2d: Successful Login
    console.log('Case 2d: Logging in with correct credentials...');
    const resLoginSuccess = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    assert.strictEqual(resLoginSuccess.status, 200, 'Expected 200 OK for successful login');
    const loginData = await resLoginSuccess.json() as any;
    assert.ok(loginData.token, 'Response should contain a JWT token');
    assert.ok(loginData.user, 'Response should contain user info');
    assert.strictEqual(loginData.user.email, testEmail, 'Logged in user email should match');
    assert.strictEqual(loginData.user.password, undefined, 'Logged in password should be omitted');
    const loginToken = loginData.token;
    console.log('✅ Login succeeded, returned a valid JWT.');


    // ----------------------------------------------------
    // TEST 3: User Details (GET /api/auth/me) Authentication
    // ----------------------------------------------------
    console.log('\n--- 👤 Test Case 3: Me (Authentication Check) ---');

    // Case 3a: No auth header
    console.log('Case 3a: Accessing /me with missing authorization header...');
    const resMeNoAuth = await fetch(`${BASE_URL}/api/auth/me`);
    assert.strictEqual(resMeNoAuth.status, 401, 'Expected 401 Unauthorized for missing auth header');
    const jsonMeNoAuth = await resMeNoAuth.json() as any;
    assert.ok(jsonMeNoAuth.error, 'Expected error message to exist');
    console.log('✅ Blocked request with missing auth header correctly.');

    // Case 3b: Invalid token
    console.log('Case 3b: Accessing /me with invalid token...');
    const resMeInvalidToken = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { 'Authorization': 'Bearer invalid_token_xyz' },
    });
    assert.strictEqual(resMeInvalidToken.status, 401, 'Expected 401 Unauthorized for invalid token');
    const jsonMeInvalidToken = await resMeInvalidToken.json() as any;
    assert.ok(jsonMeInvalidToken.error.includes('Invalid'), 'Expected error message to mention invalid token');
    console.log('✅ Blocked request with invalid token correctly.');

    // Case 3c: Valid token
    console.log('Case 3c: Accessing /me with valid token...');
    const resMeSuccess = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${loginToken}` },
    });
    assert.strictEqual(resMeSuccess.status, 200, 'Expected 200 OK with valid token');
    const meData = await resMeSuccess.json() as any;
    assert.strictEqual(meData.email, testEmail, 'Returned user email should match the authenticated user');
    assert.strictEqual(meData.name, testName, 'Returned user name should match the authenticated user');
    assert.strictEqual(meData.password, undefined, 'Returned user password should be omitted');
    console.log('✅ Successfully retrieved current user profile using JWT authorization.');


    console.log('\n🌟 All backend authentication tests completed successfully! 🌟');

  } catch (err) {
    console.error('❌ Test suite failed with error:', err);
    process.exitCode = 1;
  } finally {
    // Clean up the database (remove our test user from db.json)
    console.log('\n🧹 Cleaning up test database...');
    try {
      const dbPath = path.join(process.cwd(), 'db.json');
      if (fs.existsSync(dbPath)) {
        const raw = fs.readFileSync(dbPath, 'utf8');
        const dbData = JSON.parse(raw);
        if (dbData.users) {
          const originalLength = dbData.users.length;
          dbData.users = dbData.users.filter((u: any) => u.email !== testEmail);
          console.log(`Removed test user: ${testEmail} (${originalLength} -> ${dbData.users.length} users remaining)`);
          fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2), 'utf8');
        }
      }
      console.log('✅ Database cleaned up.');
    } catch (e) {
      console.error('⚠️ Database clean up failed:', e);
    }
  }
}

runTests();
