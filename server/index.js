const express = require('express');
require('dotenv').config();
const cors = require('cors');
const { clerkMiddleware } = require('@clerk/express'); 

const app = express();
const compRoutes = require('./routes/compilerRoutes');
const testRoutes = require('./routes/contestRoutes');
const adminRoutes = require('./routes/adminRoutes');
const testAccessRoutes = require('./routes/testAccessRoutes'); 
const authRoutes = require('./routes/authRoutes');

require('./controllers/userCon');
const { connectDB } = require('./controllers/dbCon');

const port = process.env.PORT || 8080;


connectDB();


const initCron = require('./services/cron');
initCron();

app.use(cors());
app.use(express.json());


//app.use(clerkMiddleware()); 

app.get('/', (req, res) => { res.send("SOSCEvMan API is running...") });
// Compiler Routes
// app.use("/cmp", compRoutes); 

app.use('/cmp', compRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/data', require('./routes/dataRoutes'));
app.use('/api/auth', authRoutes);

app.use('/api/test-access', testAccessRoutes); 

app.use('/api', testRoutes);

app.listen(8080, '0.0.0.0', () => {
  console.log('Server running on http://0.0.0.0:8080');
});