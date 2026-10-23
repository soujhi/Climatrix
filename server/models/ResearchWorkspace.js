import mongoose from 'mongoose';

// In-memory workspace store for instant offline testing and college viva presentations
const localWorkspaceStore = new Map();

// Seed initial realistic workspace
const seedInitialWorkspace = () => {
  const wsId = 'ws_monsoon_coastal_2026';
  localWorkspaceStore.set(wsId, {
    _id: wsId,
    title: 'Indian Coastal Climate Trends & Monsoonal Precipitation',
    researchQuestion:
      'How does surface temperature variation in coastal Indian metropolitan hubs (Chennai, Mumbai, Kochi) correlate with localized precipitation anomalies during seasonal transitions?',
    description:
      'Longitudinal comparative investigation across coastal Indian meteorological observation stations to evaluate temperature-rainfall co-variation and coastal microclimate resilience.',
    ownerId: 'usr_demo_alex',
    visibility: 'shared',
    tags: ['monsoon', 'coastal', 'precipitation', 'temperature'],
    members: [
      {
        userId: 'usr_demo_alex',
        name: 'Alex Rivera',
        email: 'alex@climatrix.edu',
        role: 'owner',
        addedAt: new Date('2026-01-01'),
      },
      {
        userId: 'usr_demo_student',
        name: 'College Student',
        email: 'student@climatrix.edu',
        role: 'editor',
        addedAt: new Date('2026-01-05'),
      },
    ],
    datasetIds: ['ds_all_india_2026'],
    researchOutputIds: ['out_imdh_coastal_2026'],
    archivedAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-10'),
  });
};
seedInitialWorkspace();

class ResearchWorkspaceMock {
  static async create(data) {
    const id = 'ws_' + Date.now() + Math.random().toString(36).substring(2, 7);
    const newWs = {
      _id: id,
      title: data.title?.trim() || '',
      researchQuestion: data.researchQuestion?.trim() || '',
      description: data.description?.trim() || '',
      ownerId: data.ownerId?.toString() || '',
      visibility: data.visibility || 'private',
      tags: Array.isArray(data.tags) ? data.tags : [],
      members: Array.isArray(data.members) ? data.members : [],
      datasetIds: Array.isArray(data.datasetIds) ? data.datasetIds : [],
      researchOutputIds: Array.isArray(data.researchOutputIds) ? data.researchOutputIds : [],
      archivedAt: data.archivedAt || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    localWorkspaceStore.set(id, newWs);
    return newWs;
  }

  static find(query = {}) {
    let list = Array.from(localWorkspaceStore.values());

    if (query.$or) {
      // Handles membership or ownership check: [{ ownerId: userId }, { 'members.userId': userId }]
      const userConditions = query.$or;
      list = list.filter((ws) => {
        return userConditions.some((cond) => {
          if (cond.ownerId && ws.ownerId?.toString() === cond.ownerId?.toString()) return true;
          if (cond['members.userId'] && ws.members?.some((m) => m.userId?.toString() === cond['members.userId']?.toString())) return true;
          if (cond.visibility === 'public' && ws.visibility === 'public') return true;
          return false;
        });
      });
    }

    if (query.archivedAt === null) {
      list = list.filter((ws) => !ws.archivedAt);
    } else if (query.archivedAt && query.archivedAt.$ne === null) {
      list = list.filter((ws) => ws.archivedAt !== null);
    }

    return {
      sort: (sortObj) => {
        list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        return list;
      },
      populate: () => list,
      exec: async () => list,
      then: (resolve) => resolve(list),
    };
  }

  static async findById(id) {
    if (!id) return null;
    const ws = localWorkspaceStore.get(id.toString());
    return ws ? { ...ws } : null;
  }

  static async findOne(query) {
    if (query._id) {
      return ResearchWorkspaceMock.findById(query._id);
    }
    return null;
  }

  static async findByIdAndUpdate(id, update, options = {}) {
    const ws = localWorkspaceStore.get(id?.toString());
    if (!ws) return null;

    if (update.$set) {
      Object.assign(ws, update.$set);
    }
    if (update.$addToSet) {
      for (const [key, val] of Object.entries(update.$addToSet)) {
        if (!Array.isArray(ws[key])) ws[key] = [];
        if (!ws[key].some((item) => (item._id || item).toString() === (val._id || val).toString())) {
          ws[key].push(val);
        }
      }
    }
    if (update.$pull) {
      for (const [key, val] of Object.entries(update.$pull)) {
        if (Array.isArray(ws[key])) {
          if (typeof val === 'object' && val.userId) {
            ws[key] = ws[key].filter((m) => m.userId?.toString() !== val.userId?.toString());
          } else {
            ws[key] = ws[key].filter((item) => item?.toString() !== val?.toString());
          }
        }
      }
    }

    // Direct field updates
    for (const [key, val] of Object.entries(update)) {
      if (!key.startsWith('$')) {
        ws[key] = val;
      }
    }

    ws.updatedAt = new Date();
    localWorkspaceStore.set(id.toString(), ws);
    return { ...ws };
  }

  static async findByIdAndDelete(id) {
    const ws = localWorkspaceStore.get(id?.toString());
    if (!ws) return null;
    localWorkspaceStore.delete(id.toString());
    return ws;
  }
}

const getWorkspaceModel = () => {
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    const memberSchema = new mongoose.Schema(
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        name: { type: String, required: true },
        email: { type: String, required: true },
        role: { type: String, enum: ['owner', 'editor', 'viewer'], default: 'viewer' },
        addedAt: { type: Date, default: Date.now },
      },
      { _id: false }
    );

    const workspaceSchema = new mongoose.Schema(
      {
        title: { type: String, required: true, trim: true, minlength: 3, maxlength: 100 },
        researchQuestion: { type: String, required: true, trim: true, minlength: 10, maxlength: 500 },
        description: { type: String, trim: true, default: '' },
        ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        visibility: { type: String, enum: ['private', 'shared', 'public'], default: 'private' },
        tags: [{ type: String, trim: true }],
        members: [memberSchema],
        datasetIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Dataset' }],
        researchOutputIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ResearchOutput' }],
        archivedAt: { type: Date, default: null },
      },
      { timestamps: true }
    );

    return mongoose.models.ResearchWorkspace || mongoose.model('ResearchWorkspace', workspaceSchema);
  }
  return ResearchWorkspaceMock;
};

export const ResearchWorkspaceProxy = new Proxy(
  {},
  {
    get(target, prop) {
      const model = getWorkspaceModel();
      return model[prop];
    },
  }
);

export default ResearchWorkspaceProxy;
