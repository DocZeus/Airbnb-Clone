const mongooose = require('mongoose');

const placeSchema = new mongooose.Schema({
    owner: {type:mongoose.Schema.Types.ObjectId, ref:'User'},
    title: String,
    address: String,
    photos: [String],
    description: String,
    perks: [String],
    extraInfo: String,
    checkIn: Number,
    checkOut: Number,
    maxGuests: Number,
});

const PlaceModel = mongooose.model('Place',placeSchema);

module.exports = PlaceModel;