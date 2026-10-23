import mongoose from 'mongoose';

const localAnalysisStore = new Map();

// Seed initial saved analysis for the initial workspace
const seedInitialAnalysis = () => {
  const analysisId = 'analysis_seed_chennai_temp_rain';
  localAnalysisStore.set(analysisId, {
    _id: analysisId,
    workspaceId: 'ws_monsoon_coastal_2026',
    title: 'Chennai: Surface Temperature vs Daily Precipitation Co-variation',
    analysisType: 'correlation',
    sourceA: {
      datasetId: 'ds_all_india_2026',
      datasetName: 'All-India Climate Survey 2026',
      field: 'temperature',
      unit: '°C',
      location: 'Chennai',
      mean: 30.17,
      stdDev: 1.33,
    },
    sourceB: {
      datasetId: 'ds_all_india_2026',
      datasetName: 'All-India Climate Survey 2026',
      field: 'rainfall',
      unit: 'mm',
      location: 'Chennai',
      mean: 4.44,
      stdDev: 6.46,
    },
    dateRange: { start: '2026-01-01', end: '2026-01-10' },
    alignmentPolicy: 'exact_date',
    missingPolicy: 'pairwise_complete',
    method: 'pearson',
    coefficient: -0.7421,
    sampleCount: 10,
    excludedCount: 0,
    strengthLabel: 'Strong linear association',
    strengthBand: 'strong',
    direction: 'Negative',
    scatterPoints: [
      { x: 29.4, y: 2.1, date: '2026-01-01', location: 'Chennai' },
      { x: 30.1, y: 0.0, date: '2026-01-02', location: 'Chennai' },
      { x: 31.2, y: 4.3, date: '2026-01-03', location: 'Chennai' },
      { x: 28.5, y: 12.4, date: '2026-01-04', location: 'Chennai' },
      { x: 27.8, y: 18.9, date: '2026-01-05', location: 'Chennai' },
      { x: 29.0, y: 5.2, date: '2026-01-06', location: 'Chennai' },
      { x: 30.4, y: 0.0, date: '2026-01-07', location: 'Chennai' },
      { x: 31.5, y: 1.5, date: '2026-01-08', location: 'Chennai' },
      { x: 30.8, y: 0.0, date: '2026-01-09', location: 'Chennai' },
      { x: 32.0, y: 0.0, date: '2026-01-10', location: 'Chennai' },
    ],
    timeSeriesPoints: [
      { date: '2026-01-01', temperature: 29.4, rainfall: 2.1, location: 'Chennai' },
      { date: '2026-01-02', temperature: 30.1, rainfall: 0.0, location: 'Chennai' },
      { date: '2026-01-03', temperature: 31.2, rainfall: 4.3, location: 'Chennai' },
      { date: '2026-01-04', temperature: 28.5, rainfall: 12.4, location: 'Chennai' },
      { date: '2026-01-05', temperature: 27.8, rainfall: 18.9, location: 'Chennai' },
      { date: '2026-01-06', temperature: 29.0, rainfall: 5.2, location: 'Chennai' },
      { date: '2026-01-07', temperature: 30.4, rainfall: 0.0, location: 'Chennai' },
      { date: '2026-01-08', temperature: 31.5, rainfall: 1.5, location: 'Chennai' },
      { date: '2026-01-09', temperature: 30.8, rainfall: 0.0, location: 'Chennai' },
      { date: '2026-01-10', temperature: 32.0, rainfall: 0.0, location: 'Chennai' },
    ],
    caveats:
      'Correlation measures linear co-variation, not causal relationship. High rainfall events coincide with cloud cover attenuation of solar insolation, driving an inverse association.',
    snapshotAt: new Date('2026-01-10T14:20:00Z'),
    createdBy: 'usr_demo_alex',
    authorName: 'Alex Rivera',
    createdAt: new Date('2026-01-10T14:20:00Z'),
    updatedAt: new Date('2026-01-10T14:20:00Z'),
  });
};
seedInitialAnalysis();

class SavedAnalysisMock {
  static async create(data) {
    const id = 'analysis_' + Date.now() + Math.random().toString(36).substring(2, 7);
    const newDoc = {
      _id: id,
      workspaceId: data.workspaceId?.toString() || '',
      title: data.title?.trim() || 'Untitled Correlation Analysis',
      analysisType: data.analysisType || 'correlation',
      sourceA: data.sourceA || {},
      sourceB: data.sourceB || {},
      dateRange: data.dateRange || {},
      alignmentPolicy: data.alignmentPolicy || 'exact_date',
      missingPolicy: data.missingPolicy || 'pairwise_complete',
      method: data.method || 'pearson',
      coefficient: data.coefficient,
      sampleCount: data.sampleCount,
      excludedCount: data.excludedCount || 0,
      strengthLabel: data.strengthLabel || '',
      strengthBand: data.strengthBand || '',
      direction: data.direction || '',
      scatterPoints: Array.isArray(data.scatterPoints) ? data.scatterPoints : [],
      timeSeriesPoints: Array.isArray(data.timeSeriesPoints) ? data.timeSeriesPoints : [],
      caveats: data.caveats || '',
      snapshotAt: data.snapshotAt || new Date(),
      createdBy: data.createdBy?.toString() || '',
      authorName: data.authorName || 'Researcher',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    localAnalysisStore.set(id, newDoc);
    return newDoc;
  }

  static find(query = {}) {
    let list = Array.from(localAnalysisStore.values());
    if (query.workspaceId) {
      list = list.filter((a) => a.workspaceId?.toString() === query.workspaceId?.toString());
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
    const a = localAnalysisStore.get(id.toString());
    return a ? { ...a } : null;
  }

  static async findByIdAndDelete(id) {
    const a = localAnalysisStore.get(id?.toString());
    if (!a) return null;
    localAnalysisStore.delete(id.toString());
    return a;
  }

  static async deleteMany(query = {}) {
    if (query.workspaceId) {
      for (const [id, a] of localAnalysisStore.entries()) {
        if (a.workspaceId?.toString() === query.workspaceId?.toString()) {
          localAnalysisStore.delete(id);
        }
      }
    }
    return { acknowledged: true };
  }
}

const getAnalysisModel = () => {
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    const sourceSchema = new mongoose.Schema(
      {
        datasetId: { type: mongoose.Schema.Types.ObjectId, ref: 'Dataset' },
        datasetName: String,
        field: String,
        unit: String,
        location: String,
        mean: Number,
        stdDev: Number,
        min: Number,
        max: Number,
      },
      { _id: false }
    );

    const analysisSchema = new mongoose.Schema(
      {
        workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'ResearchWorkspace', required: true },
        title: { type: String, required: true, trim: true },
        analysisType: { type: String, default: 'correlation' },
        sourceA: sourceSchema,
        sourceB: sourceSchema,
        dateRange: { start: String, end: String },
        alignmentPolicy: { type: String, default: 'exact_date' },
        missingPolicy: { type: String, default: 'pairwise_complete' },
        method: { type: String, default: 'pearson' },
        coefficient: { type: Number, required: true },
        sampleCount: { type: Number, required: true },
        excludedCount: { type: Number, default: 0 },
        strengthLabel: String,
        strengthBand: String,
        direction: String,
        scatterPoints: [{ x: Number, y: Number, date: String, location: String }],
        timeSeriesPoints: [mongoose.Schema.Types.Mixed],
        caveats: String,
        snapshotAt: { type: Date, default: Date.now },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        authorName: { type: String, default: 'Researcher' },
      },
      { timestamps: true }
    );

    return mongoose.models.SavedAnalysis || mongoose.model('SavedAnalysis', analysisSchema);
  }
  return SavedAnalysisMock;
};

export const SavedAnalysisProxy = new Proxy(
  {},
  {
    get(target, prop) {
      const model = getAnalysisModel();
      return model[prop];
    },
  }
);

export default SavedAnalysisProxy;
