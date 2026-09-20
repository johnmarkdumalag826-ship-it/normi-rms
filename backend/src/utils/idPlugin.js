// Applied globally (see config/db.js) so every API response uses `id` instead of
// Mongo's `_id`, matching Frontend/src/types.ts's shared entity shape.
function idPlugin(schema) {
  schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: (doc, ret) => {
      // Subdocuments declared with `{ _id: false }` (e.g. ProposalFile, chapter
      // statuses) have nothing to transform here.
      if (ret._id) {
        ret.id = ret._id.toString();
        delete ret._id;
      }
      return ret;
    },
  });
}

module.exports = idPlugin;
