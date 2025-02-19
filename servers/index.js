// Main server file
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const User  =require('./model/UserModel');
const Tracking =require("./model/TrackingModel")
const Message =require("./model/MessageModel")
const { config } = require('dotenv');
const authRoute = require('./route/UserRoute');
const trackRoute = require('./route/TrackingRoute');
const messageRoute = require('./route/MessageRoute');
const cookieParser = require('cookie-parser');
const sequelize = require('./database/database');
config();

const app = express();

app.use(bodyParser.json());
app.use(cors({
    // origin: ["http://localhost:5174"],  // Adjust based on frontend URL
    // credentials: true,  // Ensures cookies are sent
}));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/auth', authRoute);
app.use('/track', trackRoute);
app.use('/mail', messageRoute)

// Error handling middleware-
app.use((err, req, res, next) => {
    console.error(err.stack);
    if (err.name === 'SequelizeValidationError') {
        res.status(400).json({ message: 'Validation Error', details: err.errors });
    } else {
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Sync Database
const syncDatabase = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected...');
        // await User.sync({ alter: true });
        // console.log('User model synced!');
        // await Tracking.sync({ alter: true });
        // console.log('Tracking model synced!');
        await Message.sync({alter: true})
    } catch (error) {
        console.error('Error syncing database:', error.message);
    }
};

syncDatabase();

// Start the server
app.listen(process.env.PORT, () => {
    console.log(`Server is running at http://localhost:${process.env.PORT}`);
});
