import mongoose from 'mongoose';

const localNoteStore = new Map();

// Seed initial note for demonstration
const seedInitialNote = () => {
  const noteId = 'note_initial_01';
  localNoteStore.set(noteId, {
    _id: noteId,
    workspaceId: 'ws_monsoon_coastal_2026',
    title: 'Preliminary Observation: Mumbai & Chennai Thermal Diurnal Spreads',
    body: 'During early January observations, Chennai exhibited consistent daytime temperatures above 29°C with elevated relative humidity (70-85%). Daily rainfall events coincided with subtle temperature drops (approx. 1.5°C to 2.5°C), suggesting convective localized precipitation rather than synoptic scale frontal activity.',
    authorId: 'usr_demo_alex',
    authorName: 'Alex Rivera',
    createdAt: new Date('2026-01-08T10:30:00Z'),
    updatedAt: new Date('2026-01-08T10:30:00Z'),
  });
};
seedInitialNote();

class WorkspaceNoteMock {
  static async create(data) {
    const id = 'note_' + Date.now() + Math.random().toString(36).substring(2, 7);
    const newNote = {
      _id: id,
      workspaceId: data.workspaceId?.toString() || '',
      title: data.title?.trim() || 'Untitled Note',
      body: data.body || '',
      authorId: data.authorId?.toString() || '',
      authorName: data.authorName || 'Researcher',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    localNoteStore.set(id, newNote);
    return newNote;
  }

  static find(query = {}) {
    let list = Array.from(localNoteStore.values());
    if (query.workspaceId) {
      list = list.filter((n) => n.workspaceId?.toString() === query.workspaceId?.toString());
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
    const note = localNoteStore.get(id.toString());
    return note ? { ...note } : null;
  }

  static async findByIdAndUpdate(id, update, options = {}) {
    const note = localNoteStore.get(id?.toString());
    if (!note) return null;
    if (update.title !== undefined) note.title = update.title.trim();
    if (update.body !== undefined) note.body = update.body;
    note.updatedAt = new Date();
    localNoteStore.set(id.toString(), note);
    return { ...note };
  }

  static async findByIdAndDelete(id) {
    const note = localNoteStore.get(id?.toString());
    if (!note) return null;
    localNoteStore.delete(id.toString());
    return note;
  }

  static async deleteMany(query = {}) {
    if (query.workspaceId) {
      for (const [id, n] of localNoteStore.entries()) {
        if (n.workspaceId?.toString() === query.workspaceId?.toString()) {
          localNoteStore.delete(id);
        }
      }
    }
    return { acknowledged: true };
  }
}

const getNoteModel = () => {
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    const noteSchema = new mongoose.Schema(
      {
        workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'ResearchWorkspace', required: true },
        title: { type: String, required: true, trim: true },
        body: { type: String, required: true },
        authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        authorName: { type: String, required: true },
      },
      { timestamps: true }
    );
    return mongoose.models.WorkspaceNote || mongoose.model('WorkspaceNote', noteSchema);
  }
  return WorkspaceNoteMock;
};

export const WorkspaceNoteProxy = new Proxy(
  {},
  {
    get(target, prop) {
      const model = getNoteModel();
      return model[prop];
    },
  }
);

export default WorkspaceNoteProxy;
