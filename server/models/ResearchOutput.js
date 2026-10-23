import mongoose from 'mongoose';

const localOutputStore = new Map();

// Seed initial research output for the seed workspace
const seedInitialOutput = () => {
  const outId = 'out_imdh_coastal_2026';
  localOutputStore.set(outId, {
    _id: outId,
    title: 'Peninsular Indian Coastal Meteorological Assessment 2026',
    type: 'report',
    summary:
      'Empirical evaluation of daily temperature ranges, relative humidity profiles, and precipitation patterns across major west and east coast maritime observation stations in India.',
    authors: ['A. Rivera', 'IMD Coastal Observatory Collaboration'],
    url: 'https://imdpune.gov.in',
    doi: '10.1016/j.atmosres.2026.01.014',
    publishedAt: new Date('2026-01-05'),
    createdBy: 'usr_demo_alex',
    createdAt: new Date('2026-01-05'),
    updatedAt: new Date('2026-01-05'),
  });
};
seedInitialOutput();

class ResearchOutputMock {
  static async create(data) {
    const id = 'out_' + Date.now() + Math.random().toString(36).substring(2, 7);
    const newDoc = {
      _id: id,
      title: data.title?.trim() || 'Untitled Research Output',
      type: data.type || 'report',
      summary: data.summary || '',
      authors: Array.isArray(data.authors) ? data.authors : [data.author || 'Author'],
      url: data.url || '',
      doi: data.doi || '',
      publishedAt: data.publishedAt || new Date(),
      createdBy: data.createdBy?.toString() || '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    localOutputStore.set(id, newDoc);
    return newDoc;
  }

  static find(query = {}) {
    let list = Array.from(localOutputStore.values());
    if (query._id && query._id.$in) {
      const idStrings = query._id.$in.map((id) => id.toString());
      list = list.filter((o) => idStrings.includes(o._id.toString()));
    }
    return {
      sort: (sortObj) => {
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return list;
      },
      then: (resolve) => resolve(list),
    };
  }

  static async findById(id) {
    if (!id) return null;
    const item = localOutputStore.get(id.toString());
    return item ? { ...item } : null;
  }

  static async findByIdAndDelete(id) {
    const item = localOutputStore.get(id?.toString());
    if (!item) return null;
    localOutputStore.delete(id.toString());
    return item;
  }
}

const getOutputModel = () => {
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    const outputSchema = new mongoose.Schema(
      {
        title: { type: String, required: true, trim: true },
        type: { type: String, enum: ['paper', 'report', 'finding', 'memo'], default: 'report' },
        summary: { type: String, default: '' },
        authors: [{ type: String }],
        url: { type: String, default: '' },
        doi: { type: String, default: '' },
        publishedAt: { type: Date, default: Date.now },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      },
      { timestamps: true }
    );
    return mongoose.models.ResearchOutput || mongoose.model('ResearchOutput', outputSchema);
  }
  return ResearchOutputMock;
};

export const ResearchOutputProxy = new Proxy(
  {},
  {
    get(target, prop) {
      const model = getOutputModel();
      return model[prop];
    },
  }
);

export default ResearchOutputProxy;
