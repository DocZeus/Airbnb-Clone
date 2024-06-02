const express = require('express');
const cors = require('cors');
const { default: mongoose } = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken')
require('dotenv').config();
const cookieParser = require('cookie-parser');
const imageDownloader = require("image-downloader");
const multer = require('multer');
const User = require('./models/User.js');
const Place = require('./models/Place.js');
const Booking = require('./models/Booking.js');
const path = require('path');
const fs = require('fs');

const app = express();
const bcryptSalt = bcrypt.genSaltSync(10);
const jwtSecret = 'bcJHM3OtnrDexx71nWHIdy6fvoOt34ae'

app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(cors({
    credentials: true,
    origin: 'http://localhost:5173',
}));

//Upload directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

//Connect to MongoDB
mongoose.connect(process.env.MONGO_URL);


//Test Route
app.get('/test', (req, res) => {
    res.json('test ok');
})

//Register
app.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const userDoc = await User.create({
            name,
            email,
            password: bcrypt.hashSync(password, bcryptSalt),
        })
        res.json(userDoc);
    } catch (error) {
        res.status(422).json(error);
    }
})

//Login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const userDoc = await User.findOne({ email })
    if (userDoc) {
        const passOk = bcrypt.compareSync(password, userDoc.password);
        if (passOk) {
            jwt.sign({
                email: userDoc.email,
                id: userDoc._id,
            },
                jwtSecret, {},
                (err, token) => {
                    if (err) throw err;
                    res.cookie('token', token).json(userDoc)
                })
        }
        else {
            res.status(422).json('Wrong Password');
        }
    }
    else {
        res.json('Not Found');
    }
})

//Profile
app.get('/profile', (req, res) => {
    const { token } = req.cookies;
    if (token) {
        jwt.verify(token, jwtSecret, {}, async (err, userData) => {
            if (err) throw err;
            const { name, email, _id } = await User.findById(userData.id);
            res.json({ name, email, _id });
        });
    } else {
        res.json(null);
    }
})

//Logout
app.post('/logout', (req, res) => {
    res.clearCookie('token').json('Logged Out')
})

//Upload-by-Link
app.post('/upload-by-link', async (req, res) => {
    const { link } = req.body;
    const newName = 'photo' + Date.now() + '.jpg';
    const destination = path.join(__dirname, 'uploads', newName);
    try {
        await imageDownloader.image({
            url: link,
            dest: destination,
        });
        res.json({ filename: newName });
    } catch (error) {
        console.error('Error downloading image', error);
        res.status(500).json({
            error: 'Failed to download image'
        });
    }
});

//Upload-from-device
const photosMiddleware = multer({ dest: 'uploads/' });
app.post('/upload', photosMiddleware.array('photos', 100), (req, res) => {
    const uploadedFiles = [];
    for (let i = 0; i < req.files.length; i++) {
        const { path, originalname } = req.files[i];
        const parts = originalname.split('.');
        const ext = parts[parts.length - 1];
        const newPath = path + '.' + ext;
        fs.renameSync(path, newPath);
        uploadedFiles.push(newPath.replace('uploads\\', ''));
    }
    res.json(uploadedFiles);
})

//New Place
app.post('/places', (req, res) => {
    const { token } = req.cookies;
    const { title, address, addedPhotos, description,
        perks, extraInfo, checkIn, checkOut, maxGuests, price } = req.body;
    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
        if (err) throw err;
        const placeDoc = await Place.create({
            owner: userData.id,
            title, address, photos: addedPhotos, description,
            perks, extraInfo, checkIn, checkOut, maxGuests, price
        });
        res.json(placeDoc);
    });
})

//Search for a place
app.get('/user-places', (req, res) => {
    const { token } = req.cookies;
    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
        const { id } = userData;
        res.json(await Place.find({ owner: id }));
    });
})

//Find-a-place
app.get('/places/:id', async (req, res) => {
    const { id } = req.params;
    res.json(await Place.findById(id));
})

//Updating-place
app.put('/places', async (req, res) => {
    const { token } = req.cookies;
    const { id, title, address, addedPhotos, description,
        perks, extraInfo, checkIn, checkOut, maxGuests, price } = req.body;
    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
        const placeDoc = await Place.findById(id);
        if (userData.id === placeDoc.owner.toString()) {
            placeDoc.set({
                title, address, photos: addedPhotos, description,
                perks, extraInfo, checkIn, checkOut, maxGuests, price
            })
            await placeDoc.save();
            res.json('Ok');
        }
    })
})

//Index-places
app.get('/places', async (req, res) => {
    res.json(await Place.find());
})

//
app.post('/bookings', (req, res) => {
    const { place, checkIn, checkOut, price,
        numberOfGuests, name, phone } = req.body;
    Booking.create({
        place, checkIn, checkOut, price,
        numberOfGuests, name, phone
    }).then((doc) => {
        res.json(doc);
    }).catch((err) => {
        throw err;
    })
})

// Start the server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});