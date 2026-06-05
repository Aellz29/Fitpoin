import mongoose, { Schema, models } from 'mongoose';

const activitySchema = new Schema(
{
username: { type: String, required: true },
activityType: { type: String, required: true },
title: { type: String, required: true },
distance: { type: Number, default: 0 },
duration: { type: Number, required: true },
kudosCount: { type: Number, default: 0 },
earnedXP: { type: Number, required: true },
},
{
timestamps: true
}
);

const Activity = models.Activity || mongoose.model('Activity', activitySchema);
export default Activity;