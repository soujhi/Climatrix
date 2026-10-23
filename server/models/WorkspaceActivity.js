import mongoose from 'mongoose';

const localActivityStore = new Map();

// Seed initial activities for demonstration
const seedInitialActivities = () => {
  const act1 = 'act_init_01';
  localActivityStore.set(act1, {
    _id: act1,
    workspaceId: 'ws_monsoon_coastal_2026',
    actorId: 'usr_demo_alex',
    actorName: 'Alex Rivera',
    action: 'created',
    targetType: 'workspace',
    targetId: 'ws_monsoon_coastal_2026',
    summary: 'Created research workspace: Indian Coastal Climate Trends',
    createdAt: new Date('2026-01-01T09:00:00Z'),
  });

  const act2 = 'act_init_02';
  localActivityStore.set(act2, {
    _id: act2,
    workspaceId: 'ws_monsoon_coastal_2026',
    actorId: 'usr_demo_alex',
    actorName: 'Alex Rivera',
    action: 'dataset_linked',
    targetType: 'dataset',
    targetId: 'ds_all_india_2026',
    summary: 'Attached benchmark dataset: All-India Climate Survey 2026',
    createdAt: new Date('2026-01-01T09:15:00Z'),
  });

  const act3 = 'act_init_03';
  localActivityStore.set(act3, {
    _id: act3,
    workspaceId: 'ws_monsoon_coastal_2026',
    actorId: 'usr_demo_alex',
    actorName: 'Alex Rivera',
    action: 'analysis_saved',
    targetType: 'analysis',
    targetId: 'analysis_seed_chennai_temp_rain',
    summary: 'Saved correlation analysis: Chennai Temperature vs Precipitation (r = -0.7421)',
    createdAt: new Date('2026-01-10T14:20:00Z'),
  });
};
seedInitialActivities();

class WorkspaceActivityMock {
  static async create(data) {
    const id = 'act_' + Date.now() + Math.random().toString(36).substring(2, 7);
    const newAct = {
      _id: id,
      workspaceId: data.workspaceId?.toString() || '',
      actorId: data.actorId?.toString() || '',
      actorName: data.actorName || 'Researcher',
      action: data.action || 'updated',
      targetType: data.targetType || 'workspace',
      targetId: data.targetId || '',
      summary: data.summary || '',
      createdAt: new Date(),
    };
    localActivityStore.set(id, newAct);
    return newAct;
  }

  static find(query = {}) {
    let list = Array.from(localActivityStore.values());
    if (query.workspaceId) {
      list = list.filter((a) => a.workspaceId?.toString() === query.workspaceId?.toString());
    }
    return {
      sort: (sortObj) => {
        list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        return list;
      },
      limit: (n) => list.slice(0, n),
      then: (resolve) => resolve(list),
    };
  }

  static async deleteMany(query = {}) {
    if (query.workspaceId) {
      for (const [id, a] of localActivityStore.entries()) {
        if (a.workspaceId?.toString() === query.workspaceId?.toString()) {
          localActivityStore.delete(id);
        }
      }
    }
    return { acknowledged: true };
  }
}

const getActivityModel = () => {
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    const activitySchema = new mongoose.Schema(
      {
        workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'ResearchWorkspace', required: true },
        actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        actorName: { type: String, required: true },
        action: { type: String, required: true },
        targetType: { type: String, required: true },
        targetId: { type: String, default: '' },
        summary: { type: String, required: true },
      },
      { timestamps: { createdAt: true, updatedAt: false } }
    );
    return mongoose.models.WorkspaceActivity || mongoose.model('WorkspaceActivity', activitySchema);
  }
  return WorkspaceActivityMock;
};

export const WorkspaceActivityProxy = new Proxy(
  {},
  {
    get(target, prop) {
      const model = getActivityModel();
      return model[prop];
    },
  }
);

export default WorkspaceActivityProxy;
