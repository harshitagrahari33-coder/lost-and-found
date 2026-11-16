const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { _id: false }
);

const locationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, default: '', trim: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    geo: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
  },
  { _id: false }
);

const itemSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['lost', 'found'],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: [
        'Electronics',
        'Accessories',
        'Documents',
        'Bags',
        'Clothing',
        'Stationery',
        'Keys',
        'Other',
      ],
      required: true,
      index: true,
    },
    images: {
      type: [imageSchema],
      default: [],
      validate: [
        (val) => val.length <= 5,
        'Cannot upload more than 5 images per item',
      ],
    },
    location: {
      type: locationSchema,
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'resolved', 'archived'],
      default: 'active',
      index: true,
    },
    resolvedAt: {
      type: Date,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
itemSchema.index({ title: 'text', description: 'text' });
itemSchema.index({ createdAt: -1 });
itemSchema.index({ 'location.geo': '2dsphere' });

const Item = mongoose.model('Item', itemSchema);
module.exports = Item;
