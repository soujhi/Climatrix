import mongoose from 'mongoose';

// In-memory user store for instant local testing without local MongoDB server installation
const localUserStore = new Map();

// Seed initial demo users for zero-setup local presentations
localUserStore.set('usr_demo_alex', {
  _id: 'usr_demo_alex',
  name: 'Alex Rivera',
  email: 'alex@climatrix.edu',
  password: 'password123',
  role: 'Researcher',
  createdAt: new Date(),
  updatedAt: new Date(),
});

localUserStore.set('usr_demo_student', {
  _id: 'usr_demo_student',
  name: 'College Student',
  email: 'student@climatrix.edu',
  password: 'password123',
  role: 'Student',
  createdAt: new Date(),
  updatedAt: new Date(),
});

/**
 * USER MODEL PROXY
 */
class UserModelMock {
  static async findOne({ email }) {
    if (!email) return null;
    const lower = email.toLowerCase();
    for (const u of localUserStore.values()) {
      if (u.email === lower) return u;
    }
    return null;
  }

  static async findById(id) {
    const user = localUserStore.get(id?.toString());
    if (!user) return null;
    return {
      ...user,
      select: (fields) => user,
    };
  }

  static find(query = {}) {
    let users = Array.from(localUserStore.values()).map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
    }));
    return {
      select: (fields) => ({
        limit: (n) => users.slice(0, n),
        sort: () => users,
      }),
      limit: (n) => users.slice(0, n),
    };
  }

  static async create({ name, email, password, role }) {
    const id = 'usr_' + Date.now() + Math.random().toString(36).substring(2, 7);
    const newUser = {
      _id: id,
      name,
      email: email.toLowerCase(),
      password,
      role: role || 'Researcher',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    localUserStore.set(id, newUser);
    return newUser;
  }
}

// Check if Mongoose connection is ready, else use local mock model fallback
const getUserModel = () => {
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    const userSchema = new mongoose.Schema(
      {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true, lowercase: true },
        password: { type: String, required: true },
        role: { type: String, default: 'Researcher' },
      },
      { timestamps: true }
    );
    return mongoose.models.User || mongoose.model('User', userSchema);
  }
  return UserModelMock;
};

export const UserProxy = new Proxy(
  {},
  {
    get(target, prop) {
      const model = getUserModel();
      return model[prop];
    },
  }
);

export default UserProxy;
