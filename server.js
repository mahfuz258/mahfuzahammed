const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
        const prefix = req.body.fileType || 'file';
        const ext = path.extname(file.originalname) || '.jpg';
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${prefix}-${uniqueSuffix}${ext}`);
    }
});
const upload = multer({ storage: storage });

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Admin route (URL: /admin)
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Data fetch API
app.get('/api/data', (req, res) => {
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ error: 'Failed to read data file' });
        res.json(JSON.parse(data));
    });
});

// Data save API
app.post('/api/data', (req, res) => {
    const updatedData = req.body;
    fs.writeFile(DATA_FILE, JSON.stringify(updatedData, null, 2), 'utf8', (err) => {
        if (err) return res.status(500).json({ error: 'Failed to save directly to data.json' });
        res.json({ success: true, message: 'Saved successfully!' });
    });
});

// Message Receive API (Portfolio Contact Form)
app.post('/api/contact-message', (req, res) => {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
        return res.status(400).json({ success: false, message: 'Please fill all fields!' });
    }

    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ success: false, message: 'Server error' });
        
        const siteData = JSON.parse(data);
        if (!siteData.messages) siteData.messages = [];

        const newMessage = {
            id: Date.now(),
            name,
            email,
            message,
            date: new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' })
        };

        siteData.messages.unshift(newMessage);

        fs.writeFile(DATA_FILE, JSON.stringify(siteData, null, 2), 'utf8', (writeErr) => {
            if (writeErr) return res.status(500).json({ success: false, message: 'Failed to save message' });
            res.json({ success: true, message: 'Message sent successfully!' });
        });
    });
});

// Delete Message API
app.delete('/api/delete-message/:id', (req, res) => {
    const messageId = parseInt(req.params.id);
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ success: false });
        const siteData = JSON.parse(data);
        if (siteData.messages) {
            siteData.messages = siteData.messages.filter(m => m.id !== messageId);
            fs.writeFile(DATA_FILE, JSON.stringify(siteData, null, 2), 'utf8', (wErr) => {
                if (wErr) return res.status(500).json({ success: false });
                res.json({ success: true });
            });
        } else {
            res.json({ success: true });
        }
    });
});

// Admin login API
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) return res.status(500).json({ success: false, message: 'Server error' });
        const siteData = JSON.parse(data);
        const auth = siteData.adminAuth || { username: 'admin', password: '123456' };

        if (auth.username === username && auth.password === password) {
            res.json({ success: true, message: 'Login successful' });
        } else {
            res.status(401).json({ success: false, message: 'Invalid ID or Password' });
        }
    });
});

// Upload Handlers
app.post('/api/upload-image', upload.single('croppedImage'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
    res.json({ success: true, imageUrl: '/uploads/' + req.file.filename });
});

app.post('/api/upload-cv', upload.single('cvFile'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No CV file uploaded' });
    res.json({ success: true, cvUrl: '/uploads/' + req.file.filename });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Admin Dashboard URL: http://localhost:${PORT}/admin`);
});