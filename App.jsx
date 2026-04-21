import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom";
import axios from "axios";
import "./index.css";

const API = "http://localhost:5000/api";

const AuthPage = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [form, setForm] = useState({ username: "", password: "", role: "patient", name: "", specialization: "" });
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const endpoint = isLogin ? "/auth/login" : "/auth/register";
      const res = await axios.post(`${API}${endpoint}`, form);
      onLogin(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Error occurred");
    }
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h1 className="brand-logo mb-1">Kongu Hospital</h1>
        <h2>{isLogin ? "System Login" : "Register Account"}</h2>
        {error && <div className="alert-error">{error}</div>}
        <form onSubmit={handleSubmit} className="auth-form">
          <input name="username" type="text" placeholder="Username" value={form.username} onChange={handleChange} required />
          <input name="password" type="password" placeholder="Password" value={form.password} onChange={handleChange} required />
          
          {!isLogin && (
            <>
              <input name="name" type="text" placeholder="Full Name" value={form.name} onChange={handleChange} required />
              <select name="role" value={form.role} onChange={handleChange} className="select-input">
                <option value="patient">Patient</option>
                <option value="doctor">Doctor</option>
                <option value="admin">Administrator</option>
              </select>
              {form.role === 'doctor' && (
                <input name="specialization" type="text" placeholder="Specialization (e.g. Cardiology)" value={form.specialization} onChange={handleChange} required />
              )}
            </>
          )}

          <button type="submit" className="btn-solid mt-1">{isLogin ? "Log In" : "Register"}</button>
        </form>
        <p className="toggle-auth">
          {isLogin ? "New user? " : "Already have an account? "}
          <span onClick={() => setIsLogin(!isLogin)}>{isLogin ? "Register here" : "Login instead"}</span>
        </p>
      </div>
    </div>
  );
};

// PATIENT DASHBOARD
const PatientDashboard = ({ user }) => {
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [records, setRecords] = useState([]);
  const [bills, setBills] = useState([]);
  
  const [apptForm, setApptForm] = useState({ doctorId: "", date: "", time: "" });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [docs, appts, recs, bls] = await Promise.all([
      axios.get(`${API}/doctors`),
      axios.get(`${API}/appointments/${user._id}/patient`),
      axios.get(`${API}/records/${user._id}`),
      axios.get(`${API}/bills/${user._id}`)
    ]);
    setDoctors(docs.data);
    setAppointments(appts.data);
    setRecords(recs.data);
    setBills(bls.data);
  };

  const handleChange = (e) => setApptForm({ ...apptForm, [e.target.name]: e.target.value });

  const bookAppointment = async (e) => {
    e.preventDefault();
    if (!apptForm.doctorId) return alert("Select a doctor");
    await axios.post(`${API}/appointments`, { ...apptForm, patientId: user._id });
    setApptForm({ doctorId: "", date: "", time: "" });
    fetchData();
    alert("Appointment booked successfully!");
  };

  const payBill = async (id) => {
    await axios.put(`${API}/bills/${id}/pay`);
    fetchData();
  };

  return (
    <div className="dashboard-content">
      <div className="card">
        <h3>Book an Appointment</h3>
        <p className="text-muted mb-1">Choose a specific doctor and schedule your visit.</p>
        <form onSubmit={bookAppointment} className="flex-form">
          <select name="doctorId" value={apptForm.doctorId} onChange={handleChange} required className="select-input">
            <option value="">-- Choose a Doctor --</option>
            {doctors.map(d => <option key={d._id} value={d._id}>Dr. {d.name} ({d.specialization})</option>)}
          </select>
          <input type="date" name="date" value={apptForm.date} onChange={handleChange} required />
          <input type="time" name="time" value={apptForm.time} onChange={handleChange} required />
          <button type="submit" className="btn-solid">Book Now</button>
        </form>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>My Appointments</h3>
          <ul className="list-group mt-1">
            {appointments.map(a => (
              <li key={a._id} className="list-item">
                <div>
                  <strong>Dr. {a.doctorId?.name}</strong> - {a.date} at {a.time}
                </div>
                <span className={`badge badge-${a.status.toLowerCase()}`}>{a.status}</span>
              </li>
            ))}
            {appointments.length === 0 && <p className="text-muted">No appointments found.</p>}
          </ul>
        </div>
        
        <div className="card">
          <h3>My Billing</h3>
          <ul className="list-group mt-1">
            {bills.map(b => (
              <li key={b._id} className="list-item">
                <div>
                  <strong>${b.amount}</strong> - {b.description}
                </div>
                {b.status === 'Unpaid' ? (
                  <button className="btn-solid-small" onClick={() => payBill(b._id)}>Pay Now</button>
                ) : (
                  <span className="badge badge-paid">Paid</span>
                )}
              </li>
            ))}
            {bills.length === 0 && <p className="text-muted">No pending bills.</p>}
          </ul>
        </div>
      </div>

      <div className="card mt-2">
        <h3>Medical Records</h3>
        <div className="grid-3 mt-1">
          {records.map(r => (
            <div key={r._id} className="record-card">
              <h4>Dr. {r.doctorId?.name}</h4>
              <p className="text-muted text-sm">{new Date(r.date).toLocaleDateString()}</p>
              <div className="mt-1">
                <strong>Diagnosis:</strong>
                <p>{r.diagnosis}</p>
              </div>
              <div className="mt-1">
                <strong>Prescription:</strong>
                <p>{r.prescription}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// DOCTOR DASHBOARD
const DoctorDashboard = ({ user }) => {
  const [appointments, setAppointments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [activeAppt, setActiveAppt] = useState(null);
  const [recForm, setRecForm] = useState({ diagnosis: "", prescription: "" });

  useEffect(() => { fetchAppointments(); }, []);

  const fetchAppointments = async () => {
    const appts = await axios.get(`${API}/appointments/${user._id}/doctor`);
    setAppointments(appts.data);
  };

  const updateApptStatus = async (id, status) => {
    await axios.put(`${API}/appointments/${id}`, { status });
    fetchAppointments();
  };

  const openRecordModal = (appt) => {
    setActiveAppt(appt);
    setShowModal(true);
  };

  const submitRecord = async (e) => {
    e.preventDefault();
    // 1. Mark appointment complete
    await updateApptStatus(activeAppt._id, 'Completed');
    // 2. Add medical record
    await axios.post(`${API}/records`, {
      patientId: activeAppt.patientId._id,
      doctorId: user._id,
      ...recForm
    });
    // 3. Close
    setShowModal(false);
    setRecForm({ diagnosis: "", prescription: "" });
  };

  return (
    <div className="dashboard-content">
      <div className="card">
        <h3>Doctor Dashboard: Dr. {user.name} ({user.specialization})</h3>
        <p className="text-muted">Manage your daily appointments and update patient medical records.</p>
      </div>

      <div className="card">
        <h3>Scheduled Appointments</h3>
        <ul className="list-group mt-1">
          {appointments.map(a => (
            <li key={a._id} className="list-item">
              <div>
                <strong>{a.patientId?.name}</strong> <br/>
                <span className="text-muted">{a.date} at {a.time}</span>
              </div>
              <div className="flex-gap">
                <span className={`badge badge-${a.status.toLowerCase()}`}>{a.status}</span>
                {a.status === 'Pending' && <button className="btn-outline-small" onClick={() => updateApptStatus(a._id, 'Confirmed')}>Confirm</button>}
                {a.status === 'Confirmed' && <button className="btn-solid-small" onClick={() => openRecordModal(a)}>Add Record & Complete</button>}
              </div>
            </li>
          ))}
          {appointments.length === 0 && <p className="text-muted">No appointments scheduled.</p>}
        </ul>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal card">
            <h3>Add Medical Record for {activeAppt.patientId?.name}</h3>
            <form onSubmit={submitRecord} className="form mt-1">
              <textarea placeholder="Diagnosis" value={recForm.diagnosis} onChange={e => setRecForm({...recForm, diagnosis: e.target.value})} required rows="3"></textarea>
              <textarea placeholder="Prescription / Treatment" value={recForm.prescription} onChange={e => setRecForm({...recForm, prescription: e.target.value})} required rows="3"></textarea>
              <div className="flex-gap mt-1" style={{justifyContent: 'flex-end'}}>
                <button type="button" className="btn-outline-small" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-solid-small">Save Record</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ADMIN DASHBOARD
const AdminDashboard = () => {
  const [patients, setPatients] = useState([]);
  const [billForm, setBillForm] = useState({ patientId: "", amount: "", description: "" });

  useEffect(() => {
    axios.get(`${API}/patients`).then(res => setPatients(res.data));
  }, []);

  const generateBill = async (e) => {
    e.preventDefault();
    if (!billForm.patientId) return alert("Select patient");
    await axios.post(`${API}/bills`, billForm);
    alert("Bill generated and assigned to patient!");
    setBillForm({ patientId: "", amount: "", description: "" });
  };

  return (
    <div className="dashboard-content">
      <div className="card" style={{backgroundColor: '#1f2937', color: 'white'}}>
        <h3>Administrator Panel</h3>
        <p style={{color: '#9ca3af'}}>System-wide control mechanism.</p>
      </div>

      <div className="card">
        <h3>Generate Billing</h3>
        <form onSubmit={generateBill} className="flex-form mt-1">
          <select value={billForm.patientId} onChange={e => setBillForm({...billForm, patientId: e.target.value})} required className="select-input">
            <option value="">-- Select Patient --</option>
            {patients.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
          </select>
          <input type="number" placeholder="Amount ($)" value={billForm.amount} onChange={e => setBillForm({...billForm, amount: e.target.value})} required />
          <input type="text" placeholder="Description (e.g. Lab Tests)" value={billForm.description} onChange={e => setBillForm({...billForm, description: e.target.value})} required style={{flex: 2}} />
          <button type="submit" className="btn-solid">Issue Bill</button>
        </form>
      </div>
    </div>
  );
};

// Header Component
const Header = ({ user, onLogout }) => (
  <nav className="navbar-top">
    <div className="nav-inner">
      <div className="nav-brand">
        <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>🏥 Kongu Hospital</Link> 
        {user && <span className="role-chip">{user.role}</span>}
      </div>
      {user && (
        <div className="flex-gap" style={{alignItems: 'center'}}>
          <Link to="/" style={{ color: 'inherit', marginRight: '15px', textDecoration: 'none', fontWeight: 600 }}>Dashboard</Link>
          <span style={{ fontWeight: 600 }}>{user.name}</span>
          <button className="btn-outline-small" onClick={onLogout}>Logout</button>
        </div>
      )}
    </div>
  </nav>
);

// App Component
const App = () => {
  const [user, setUser] = useState(null);

  return (
    <Router>
      <div className="app-container">
        <Header user={user} onLogout={() => setUser(null)} />
        
        <div className="dashboard-layout">
          <Routes>
            {!user ? (
              <Route path="*" element={<AuthPage onLogin={setUser} />} />
            ) : (
              <>
                <Route path="/" element={
                  user.role === 'patient' ? <PatientDashboard user={user} /> :
                  user.role === 'doctor' ? <DoctorDashboard user={user} /> :
                  <AdminDashboard />
                } />
                <Route path="*" element={<Navigate to="/" replace />} />
              </>
            )}
          </Routes>
        </div>
      </div>
    </Router>
  );
};

export default App;
