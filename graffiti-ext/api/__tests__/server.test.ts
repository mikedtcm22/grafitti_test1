process.env.SUPABASE_URL = 'http://dummy-url';
process.env.SUPABASE_ANON_KEY = 'dummy-key';

import request from 'supertest';
import { createApp } from '../server';
import { SupabaseDAL } from '../../src/data/index';
import bcrypt from 'bcryptjs';

// Mock the SupabaseDAL
jest.mock('../../src/data/index', () => ({
  SupabaseDAL: jest.fn().mockImplementation(() => ({
    createProfile: jest.fn(),
    getProfiles: jest.fn()
  }))
}));

describe('Express API', () => {
  let mockDal: jest.Mocked<SupabaseDAL>;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDal = new SupabaseDAL('mock-url', 'mock-key') as jest.Mocked<SupabaseDAL>;
    app = createApp(mockDal);
  });

  describe('POST /api/profile', () => {
    it('should create a new profile successfully', async () => {
      const mockProfile = {
        id: 'test-id',
        display_name: 'testuser',
        passcode_hash: 'hashed-passcode',
        created_at: '2024-03-14T00:00:00Z'
      };

      mockDal.createProfile.mockResolvedValue(mockProfile);

      const response = await request(app)
        .post('/api/profile')
        .send({
          display_name: 'testuser',
          passcode: 'password123'
        });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        id: mockProfile.id,
        display_name: mockProfile.display_name,
        created_at: mockProfile.created_at
      });
      expect(mockDal.createProfile).toHaveBeenCalledWith(
        'testuser',
        expect.any(String) // bcrypt hash
      );
    });

    it('should return 409 for duplicate display name', async () => {
      mockDal.createProfile.mockRejectedValue(new Error('duplicate key value'));

      const response = await request(app)
        .post('/api/profile')
        .send({
          display_name: 'existinguser',
          passcode: 'password123'
        });

      expect(response.status).toBe(409);
      expect(response.body).toEqual({
        error: 'Display name already taken'
      });
    });

    it('should return 400 for invalid display name', async () => {
      const response = await request(app)
        .post('/api/profile')
        .send({
          display_name: 'a', // too short
          passcode: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Invalid display_name'
      });
    });

    it('should return 400 for invalid passcode', async () => {
      const response = await request(app)
        .post('/api/profile')
        .send({
          display_name: 'testuser',
          passcode: '123' // too short
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Invalid passcode'
      });
    });
  });

  describe('POST /api/login', () => {
    it('should login successfully with correct credentials', async () => {
      const hashedPasscode = await bcrypt.hash('password123', 10);
      const mockProfile = {
        id: 'test-id',
        display_name: 'testuser',
        passcode_hash: hashedPasscode,
        created_at: '2024-03-14T00:00:00Z'
      };

      mockDal.getProfiles.mockResolvedValue([mockProfile]);

      const response = await request(app)
        .post('/api/login')
        .send({
          display_name: 'testuser',
          passcode: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: mockProfile.id,
        display_name: mockProfile.display_name,
        created_at: mockProfile.created_at
      });
    });

    it('should return 404 for non-existent user', async () => {
      mockDal.getProfiles.mockResolvedValue([]);

      const response = await request(app)
        .post('/api/login')
        .send({
          display_name: 'nonexistent',
          passcode: 'password123'
        });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        error: 'Profile not found'
      });
    });

    it('should return 401 for incorrect passcode', async () => {
      const hashedPasscode = await bcrypt.hash('correctpass', 10);
      const mockProfile = {
        id: 'test-id',
        display_name: 'testuser',
        passcode_hash: hashedPasscode,
        created_at: '2024-03-14T00:00:00Z'
      };

      mockDal.getProfiles.mockResolvedValue([mockProfile]);

      const response = await request(app)
        .post('/api/login')
        .send({
          display_name: 'testuser',
          passcode: 'wrongpass'
        });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: 'Incorrect passcode'
      });
    });

    it('should return 400 for invalid display name', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          display_name: 'a', // too short
          passcode: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Invalid display_name'
      });
    });

    it('should return 400 for invalid passcode', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          display_name: 'testuser',
          passcode: '123' // too short
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: 'Invalid passcode'
      });
    });
  });
}); 