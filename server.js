const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect("mongodb://127.0.0.1:27017/HospitalDB")
  .then(() => console.log("Connected to MongoDB HospitalDB"))
  .catch(err => console.error(err));

// SCHEMAS
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['patient', 'doctor', 'admin'], default: 'patient' },
    name: String,
    specialization: String, // only for doctors
});
const User = mongoose.model("User", userSchema);

const appointmentSchema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    date: String,
    time: String,
    status: { type: String, default: 'Pending' } // Pending, Confirmed, Completed
});
const Appointment = mongoose.model("Appointment", appointmentSchema);

const recordSchema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    diagnosis: String,
    prescription: String,
    date: { type: Date, default: Date.now }
});
const Record = mongoose.model("Record", recordSchema);

const billSchema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    amount: Number,
    description: String,
    status: { type: String, default: 'Unpaid' }, 
    date: { type: Date, default: Date.now }
});
const Bill = mongoose.model("Bill", billSchema);


// --- AUTH ---
app.post('/api/auth/register', async (req, res) => {
    try {
        const user = new User(req.body);
        await user.save();
        res.status(201).json(user);
    } catch (err) { res.status(400).json({ error: "Username already exists." }); }
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });
    if(user) res.json(user); else res.status(401).json({ error: "Invalid credentials" });
});

// --- USERS ---
app.get('/api/doctors', async (req, res) => {
    const doctors = await User.find({ role: 'doctor' }, '-password');
    res.json(doctors);
});

app.get('/api/patients', async (req, res) => {
    const patients = await User.find({ role: 'patient' }, '-password');
    res.json(patients);
});

// --- APPOINTMENTS ---
app.get('/api/appointments/:userId/:role', async (req, res) => {
    const { userId, role } = req.params;
    let query = {};
    if (role === 'patient') query.patientId = userId;
    else if (role === 'doctor') query.doctorId = userId;
    
    const appts = await Appointment.find(query).populate('patientId doctorId', 'name specialization');
    res.json(appts);
});

app.post('/api/appointments', async (req, res) => {
    const appt = new Appointment(req.body);
    await appt.save();
    res.json(appt);
});

app.put('/api/appointments/:id', async (req, res) => {
    const appt = await Appointment.findByIdAndUpdate(req.params.id, { status: req.body.status }, {new: true});
    res.json(appt);
});

// --- MEDICAL RECORDS ---
app.get('/api/records/:patientId', async (req, res) => {
    let query = req.params.patientId === 'all' ? {} : { patientId: req.params.patientId };
    const records = await Record.find(query).populate('patientId doctorId', 'name specialization');
    res.json(records);
});

app.post('/api/records', async (req, res) => {
    const rec = new Record(req.body);
    await rec.save();
    res.json(rec);
});

// --- BILLING ---
app.get('/api/bills/:patientId', async (req, res) => {
    let query = req.params.patientId === 'all' ? {} : { patientId: req.params.patientId };
    const bills = await Bill.find(query).populate('patientId', 'name');
    res.json(bills);
});

app.post('/api/bills', async (req, res) => {
    const bill = new Bill(req.body);
    await bill.save();
    res.json(bill);
});

app.put('/api/bills/:id/pay', async (req, res) => {
    const bill = await Bill.findByIdAndUpdate(req.params.id, { status: 'Paid' }, {new: true});
    res.json(bill);
});

app.listen(5000, () => console.log("HMS API running on 5000"));
