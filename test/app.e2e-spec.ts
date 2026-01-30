import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

/**
 * E2E Tests for NSWallet API
 *
 * Tests the complete request/response cycle including:
 * - Authentication flow
 * - Wallet operations
 * - Error handling
 *
 * NOTE: These tests require a test database
 * Set DATABASE_URL_TEST in your .env.test file
 */
describe('NSWallet API (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let accessToken: string;
  let userId: string;
  let walletId: string;

  const testUser = {
    email: 'test@example.com',
    password: 'SecurePassword123!',
    name: 'Test User',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    prismaService = app.get<PrismaService>(PrismaService);

    // Clean test database
    if (process.env.NODE_ENV === 'test') {
      await prismaService.cleanDatabase();
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Check', () => {
    it('GET /api/v1/health should return ok', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
          expect(res.body.timestamp).toBeDefined();
        });
    });
  });

  describe('Authentication', () => {
    it('POST /api/v1/auth/register should create a new user', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201)
        .expect((res) => {
          expect(res.body.user).toBeDefined();
          expect(res.body.user.email).toBe(testUser.email);
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.user.passwordHash).toBeUndefined();

          accessToken = res.body.accessToken;
          userId = res.body.user.id;
        });
    });

    it('POST /api/v1/auth/register should reject duplicate email', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(409);
    });

    it('POST /api/v1/auth/register should reject weak password', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'weak@example.com',
          password: 'weak',
          name: 'Weak Password User',
        })
        .expect(400);
    });

    it('POST /api/v1/auth/login should authenticate user', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.user).toBeDefined();
          expect(res.body.accessToken).toBeDefined();
          expect(res.body.expiresIn).toBeDefined();

          accessToken = res.body.accessToken;
        });
    });

    it('POST /api/v1/auth/login should reject invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
        })
        .expect(401);
    });
  });

  describe('Wallets', () => {
    it('POST /api/v1/wallets should create a wallet', () => {
      return request(app.getHttpServer())
        .post('/api/v1/wallets')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          name: 'My NGN Wallet',
          currency: 'NGN',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.id).toBeDefined();
          expect(res.body.name).toBe('My NGN Wallet');
          expect(res.body.currency).toBe('NGN');

          walletId = res.body.id;
        });
    });

    it('POST /api/v1/wallets should require authentication', () => {
      return request(app.getHttpServer())
        .post('/api/v1/wallets')
        .send({
          name: 'Unauthorized Wallet',
          currency: 'USD',
        })
        .expect(401);
    });

    it('GET /api/v1/wallets should list user wallets', () => {
      return request(app.getHttpServer())
        .get('/api/v1/wallets')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('GET /api/v1/wallets/:id should get wallet details', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/wallets/${walletId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(walletId);
        });
    });

    it('PATCH /api/v1/wallets/:id/fund should add funds', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/wallets/${walletId}/fund`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          amount: 10000,
          description: 'Initial deposit',
        })
        .expect(200)
        .expect((res) => {
          expect(parseFloat(res.body.balance)).toBe(10000);
        });
    });

    it('PATCH /api/v1/wallets/:id/withdraw should withdraw funds', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/wallets/${walletId}/withdraw`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          amount: 3000,
          description: 'Test withdrawal',
        })
        .expect(200)
        .expect((res) => {
          expect(parseFloat(res.body.balance)).toBe(7000);
        });
    });

    it('PATCH /api/v1/wallets/:id/withdraw should reject insufficient funds', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/wallets/${walletId}/withdraw`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          amount: 999999,
          description: 'Should fail',
        })
        .expect(400);
    });

    it('GET /api/v1/wallets/:id/transactions should list transactions', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/wallets/${walletId}/transactions`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBe(2); // 1 fund + 1 withdraw
        });
    });

    it('DELETE /api/v1/wallets/:id should soft delete wallet', () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/wallets/${walletId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);
    });

    it('GET /api/v1/wallets/:id should return 404 for deleted wallet', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/wallets/${walletId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('Rates', () => {
    it('GET /api/v1/rates should return exchange rates', () => {
      return request(app.getHttpServer())
        .get('/api/v1/rates?base=NGN')
        .expect(200)
        .expect((res) => {
          expect(res.body.base).toBe('NGN');
          expect(res.body.rates).toBeDefined();
        });
    });

    it('GET /api/v1/rates/currencies should list supported currencies', () => {
      return request(app.getHttpServer())
        .get('/api/v1/rates/currencies')
        .expect(200)
        .expect((res) => {
          expect(res.body.currencies).toBeDefined();
          expect(res.body.currencies).toContain('USD');
          expect(res.body.currencies).toContain('NGN');
        });
    });
  });

  describe('User Profile', () => {
    it('GET /api/v1/users/me should return current user', () => {
      return request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(userId);
          expect(res.body.email).toBe(testUser.email);
          expect(res.body.passwordHash).toBeUndefined();
        });
    });

    it('PATCH /api/v1/users/me should update profile', () => {
      return request(app.getHttpServer())
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Updated Name' })
        .expect(200)
        .expect((res) => {
          expect(res.body.name).toBe('Updated Name');
        });
    });
  });
});
